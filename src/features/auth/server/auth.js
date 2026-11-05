import "server-only"
import { getDb, getMongoClient } from "@/server/db/client"
import { appEnv, authEnv } from "@/config/env"
import { createAuth } from "./create-auth"

const cache = globalThis

export const getAuth = () => {
  const client = getMongoClient()
  if (!cache.veloraAuth || cache.veloraAuthClient !== client) {
    const { BETTER_AUTH_SECRET, BETTER_AUTH_URL } = authEnv()
    cache.veloraAuth = createAuth({ db: getDb(), client, secret: BETTER_AUTH_SECRET, baseURL: BETTER_AUTH_URL, ipHeader: appEnv().CLIENT_IP_HEADER })
    cache.veloraAuthClient = client
  }
  return cache.veloraAuth
}
