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

const input = z
  .object({
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, { error: "--username: 3 to 30 letters, digits, dots, dashes or underscores" }),
    name: z.string().trim().min(2, { error: "--name is required" }),
    email: z.email({ error: "--email must be a valid email" }),
    password: z.string().min(8, { error: "OWNER_PASSWORD must be at least 8 characters" }).max(128),
  })
  .safeParse({ username: values.username, name: values.name, email: values.email, password: process.env.OWNER_PASSWORD })

if (!input.success) {
  console.error(z.prettifyError(input.error))
  console.error('Usage: OWNER_PASSWORD=... bun run db:create-owner --username asif --name "ASIF" --email asif@example.com [--update]')
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
    const taken = await db.collection(C.users).findOne({ _id: { $ne: owner._id }, $or: [{ username }, { email: email.toLowerCase() }] }, { projection: { _id: 1 } })
    if (taken) {
      console.error("Another account already uses that username or email.")
      process.exitCode = 1
    } else {
      const ctx = await createAuth({ db, client, secret: authEnv().BETTER_AUTH_SECRET }).$context
      await db.collection(C.users).updateOne({ _id: owner._id }, { $set: { username, displayUsername: username, name, email: email.toLowerCase(), updatedAt: new Date() } })
      await ctx.internalAdapter.updatePassword(owner._id, await ctx.password.hash(password))
      await db.collection(C.sessions).deleteMany({ userId: owner._id })
      console.log(`Owner updated. Sign in as ${username} or ${email.toLowerCase()}.`)
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
