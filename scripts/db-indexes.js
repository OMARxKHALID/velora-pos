import { createMongoClient } from "@/server/db/connect"
import { ensureIndexes } from "@/server/db/indexes"
import { databaseEnv } from "@/config/env"

const { MONGODB_URI, MONGODB_DB } = databaseEnv()
const client = createMongoClient(MONGODB_URI)

try {
  const created = await ensureIndexes(client.db(MONGODB_DB))
  for (const [collection, names] of Object.entries(created)) console.log(`${collection}: ${names.join(", ")}`)
} finally {
  await client.close()
}
