import { afterAll, beforeAll } from "bun:test"
import { createMongoClient } from "@/lib/db/connect"
import { ensureIndexes } from "@/lib/db/indexes"
import { newId } from "@/lib/id"

export const TEST_URI = process.env.MONGODB_TEST_URI

export const hasTestDatabase = Boolean(TEST_URI)

export const useTestDatabase = () => {
  const context = { client: null, db: null }

  beforeAll(async () => {
    context.client = createMongoClient(TEST_URI)
    context.db = context.client.db(`velora_test_${newId().slice(0, 8)}`)
    await ensureIndexes(context.db)
  })

  afterAll(async () => {
    await context.db?.dropDatabase()
    await context.client?.close()
  })

  return context
}
