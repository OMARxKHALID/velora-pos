import { createAuth } from "@/features/auth/server/create-auth"
import { dropCollections, loadDocuments, seedDocuments } from "@/features/sample-data/lib/seed-documents"
import { seedSampleTeam } from "@/features/sample-data/server/sample-data"
import { createMongoClient } from "@/server/db/connect"
import { COLLECTIONS } from "@/server/db/collections"
import { ensureIndexes } from "@/server/db/indexes"
import { appEnv, authEnv, databaseEnv, pinSecret } from "@/config/env"

const reset = process.argv.includes("--reset")
const { MONGODB_URI, MONGODB_DB } = databaseEnv()
const { SAMPLE_DATA } = appEnv()
const { BETTER_AUTH_SECRET, SAMPLE_PASSWORD } = authEnv()

if (!SAMPLE_DATA) {
  console.error("Refusing to seed: set SAMPLE_DATA=true. Seeding writes 30 days of sample sales into the database.")
  process.exit(1)
}

const client = createMongoClient(MONGODB_URI)

try {
  const db = client.db(MONGODB_DB)
  const hasData = (await db.collection(COLLECTIONS.sales).estimatedDocumentCount()) > 0
  if (hasData && !reset) {
    console.error(`Database "${MONGODB_DB}" already has sales. Run with --reset to replace everything with fresh sample data.`)
    process.exitCode = 1
  } else {
    if (reset) await dropCollections(db)
    await ensureIndexes(db)
    const inserted = await loadDocuments(db, seedDocuments())
    inserted.users = await seedSampleTeam({ auth: createAuth({ db, client, secret: BETTER_AUTH_SECRET }), db, password: SAMPLE_PASSWORD, pinSecret: pinSecret() })
    for (const [collection, count] of Object.entries(inserted)) console.log(`${collection}: ${count}`)
    console.log(`Sign in as asif (owner), bilal (supervisor, PIN 1234) or hamza (cashier) with the SAMPLE_PASSWORD.`)
    console.log(`Seeded "${MONGODB_DB}".`)
  }
} finally {
  await client.close()
}
