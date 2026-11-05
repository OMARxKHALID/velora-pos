import { parseArgs } from "node:util"
import { z } from "zod"
import { createAuth, newUserId } from "@/features/auth/server/create-auth"
import { createAccount } from "@/features/auth/server/accounts"
import { ensureFirstShop } from "@/features/shops/server/first-shop"
import { COLLECTIONS as C } from "@/server/db/collections"
import { createMongoClient } from "@/server/db/connect"
import { ensureIndexes } from "@/server/db/indexes"
import { authEnv, databaseEnv } from "@/config/env"

const { values } = parseArgs({ options: { username: { type: "string" }, name: { type: "string" }, email: { type: "string" }, update: { type: "boolean", default: false } } })

const fields = {
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, { error: "--username: 3 to 30 letters, digits, dots, dashes or underscores" }),
  name: z.string().trim().min(2, { error: "--name is required" }),
  email: z.email({ error: "--email must be a valid email" }),
  password: z.string().min(8, { error: "OWNER_PASSWORD must be at least 8 characters" }).max(128),
}

const raw = { username: values.username, name: values.name, email: values.email, password: process.env.OWNER_PASSWORD }

const input = values.update
  ? z.object(fields).partial().refine((data) => Object.values(data).some(Boolean), { error: "Give at least one of --username, --name, --email or OWNER_PASSWORD" }).safeParse(raw)
  : z.object(fields).safeParse(raw)

if (!input.success) {
  console.error(z.prettifyError(input.error))
  console.error('Create: OWNER_PASSWORD=... bun run db:create-owner --username asif --name "ASIF" --email asif@example.com')
  console.error('Update: OWNER_PASSWORD=... bun run db:create-owner --update [--username admin] [--name "Owner"] [--email admin@gmail.com]')
  process.exit(1)
}

const { MONGODB_URI, MONGODB_DB } = databaseEnv()
const client = createMongoClient(MONGODB_URI)

try {
  const db = client.db(MONGODB_DB)
  await ensureIndexes(db)
  const owner = await db.collection(C.users).findOne({ role: "admin" })
  if (owner && values.update) {
    const { username, name, email, password } = input.data
    const changes = { ...(username && { username, displayUsername: username }), ...(name && { name }), ...(email && { email: email.toLowerCase() }) }
    const clashes = [...(username ? [{ username }] : []), ...(email ? [{ email: email.toLowerCase() }] : [])]
    const taken = clashes.length ? await db.collection(C.users).findOne({ _id: { $ne: owner._id }, $or: clashes }, { projection: { _id: 1 } }) : null
    if (taken) {
      console.error("Another account already uses that username or email.")
      process.exitCode = 1
    } else {
      if (Object.keys(changes).length) await db.collection(C.users).updateOne({ _id: owner._id }, { $set: { ...changes, updatedAt: new Date() } })
      if (password) {
        const ctx = await createAuth({ db, client, secret: authEnv().BETTER_AUTH_SECRET }).$context
        await ctx.internalAdapter.updatePassword(owner._id, await ctx.password.hash(password))
      }
      await db.collection(C.sessions).deleteMany({ userId: owner._id })
      const now = await db.collection(C.users).findOne({ _id: owner._id }, { projection: { username: 1, email: 1 } })
      console.log(`Owner updated. Sign in as ${now.username} or ${now.email}.`)
    }
  } else if (owner) {
    console.error("An owner account already exists. Run again with --update to change its username, email and password.")
    process.exitCode = 1
  } else {
    const { username, name, email, password } = input.data
    const id = newUserId()
    const now = new Date()
    await createAccount(createAuth({ db, client, secret: authEnv().BETTER_AUTH_SECRET }), {
      id,
      password,
      name,
      email: email.toLowerCase(),
      emailVerified: true,
      username,
      displayUsername: username,
      role: "admin",
      banned: false,
      shopIds: [],
      createdAt: now,
      updatedAt: now,
    })
    console.log(`Owner ${username} created (${id}).`)
    const created = await ensureFirstShop(db)
    if (created.length) console.log("Shop, counter and settings created. Sign in and add products and staff.")
  }
} finally {
  await client.close()
}
