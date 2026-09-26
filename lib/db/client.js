import "server-only"
import { attachDatabasePool } from "@vercel/functions"
import { databaseEnv } from "@/lib/env"
import { createMongoClient } from "./connect"

const cache = globalThis

export const getMongoClient = () => {
  if (!cache.veloraMongoClient) {
    const client = createMongoClient(databaseEnv().MONGODB_URI)
    attachDatabasePool(client)
    client.once("topologyClosed", () => {
      if (cache.veloraMongoClient === client) cache.veloraMongoClient = null
    })
    cache.veloraMongoClient = client
  }
  return cache.veloraMongoClient
}

export const getDb = () => getMongoClient().db(databaseEnv().MONGODB_DB)
