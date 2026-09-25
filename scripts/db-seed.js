import { dropCollections, loadDocuments, seedDocuments } from "@/features/demo/lib/seed-documents"
import { createMongoClient } from "@/lib/db/connect"
import { COLLECTIONS } from "@/lib/db/collections"
import { ensureIndexes } from "@/lib/db/indexes"
import { appEnv, databaseEnv } from "@/lib/env"

const reset = process.argv.includes("--reset")
const { MONGODB_URI, MONGODB_DB } = databaseEnv()
const { DEMO_MODE } = appEnv()

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
    for (const [collection, count] of Object.entries(inserted)) console.log(`${collection}: ${count}`)
    console.log(`Seeded "${MONGODB_DB}".`)
  }
} finally {
  await client.close()
}
