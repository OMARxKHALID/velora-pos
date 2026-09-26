import { parseArgs } from "node:util"
import { z } from "zod"
import { createAuth, newUserId } from "@/features/auth/server/create-auth"
import { createAccount } from "@/features/auth/server/accounts"
import { ensureFirstShop } from "@/features/shops/server/first-shop"
import { COLLECTIONS as C } from "@/server/db/collections"
import { createMongoClient } from "@/server/db/connect"
import { ensureIndexes } from "@/server/db/indexes"
import { authEnv, databaseEnv } from "@/config/env"

const { values } = parseArgs({ options: { username: { type: "string" }, name: { type: "string" }, email: { type: "string" } } })

const input = z
  .object({
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, { error: "--username: 3 to 30 letters, digits, dots, dashes or underscores" }),
    name: z.string().trim().min(2, { error: "--name is required" }),
    email: z.email({ error: "--email must be a valid email" }),
    password: z.string().min(12, { error: "OWNER_PASSWORD must be at least 12 characters" }),
  })
  .safeParse({ ...values, password: process.env.OWNER_PASSWORD })

if (!input.success) {
  console.error(z.prettifyError(input.error))
  console.error('Usage: OWNER_PASSWORD=... bun scripts/create-owner.js --username asif --name "ASIF" --email asif@example.com')
  process.exit(1)
}

const { MONGODB_URI, MONGODB_DB } = databaseEnv()
const client = createMongoClient(MONGODB_URI)

try {
  const db = client.db(MONGODB_DB)
  await ensureIndexes(db)
  if (await db.collection(C.users).findOne({ role: "admin" })) {
    console.error("An owner account already exists. Sign in as the owner to manage staff.")
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
