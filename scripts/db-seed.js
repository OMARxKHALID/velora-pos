import { createAuth } from "@/features/auth/server/create-auth"
import { dropCollections, loadDocuments, seedDocuments } from "@/features/demo/lib/seed-documents"
import { seedDemoTeam } from "@/features/demo/server/team"
import { createMongoClient } from "@/lib/db/connect"
import { COLLECTIONS } from "@/lib/db/collections"
import { ensureIndexes } from "@/lib/db/indexes"
import { appEnv, authEnv, databaseEnv, pinSecret } from "@/lib/env"

const reset = process.argv.includes("--reset")
const { MONGODB_URI, MONGODB_DB } = databaseEnv()
const { DEMO_MODE } = appEnv()
const { BETTER_AUTH_SECRET, DEMO_PASSWORD } = authEnv()

if (!DEMO_MODE) {
  console.error("Refusing to seed: set DEMO_MODE=true. Seeding writes 30 days of sample sales into the database.")
  process.exit(1)
}

const client = createMongoClient(MONGODB_URI)

try {
  const db = client.db(MONGODB_DB)
  const hasData = (await db.collection(COLLECTIONS.sales).estimatedDocumentCount()) > 0
  if (hasData && !reset) {
    console.error(`Database "${MONGODB_DB}" already has sales. Run with --reset to replace everything with fresh demo data.`)
    process.exitCode = 1
  } else {
    if (reset) await dropCollections(db)
    await ensureIndexes(db)
    const inserted = await loadDocuments(db, seedDocuments())
    inserted.users = await seedDemoTeam({ auth: createAuth({ db, client, secret: BETTER_AUTH_SECRET }), db, password: DEMO_PASSWORD, pinSecret: pinSecret() })
    for (const [collection, count] of Object.entries(inserted)) console.log(`${collection}: ${count}`)
    console.log(`Sign in as asif (owner), bilal (supervisor, PIN 1234) or hamza (cashier) with the DEMO_PASSWORD.`)
    console.log(`Seeded "${MONGODB_DB}".`)
  }
} finally {
  await client.close()
}
