import "server-only"
import { getDb, getMongoClient } from "@/lib/db/client"
import { authEnv } from "@/lib/env"
import { createAuth } from "./create-auth"

const cache = globalThis

export const getAuth = () => {
  if (!cache.veloraAuth) {
    const { BETTER_AUTH_SECRET, BETTER_AUTH_URL } = authEnv()
    cache.veloraAuth = createAuth({ db: getDb(), client: getMongoClient(), secret: BETTER_AUTH_SECRET, baseURL: BETTER_AUTH_URL })
  }
  return cache.veloraAuth
}
