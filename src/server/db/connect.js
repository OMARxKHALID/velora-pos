import { MongoClient } from "mongodb"

const CLIENT_OPTIONS = {
  appName: "velora-pos",
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 5 * 60 * 1000,
  serverSelectionTimeoutMS: 5000,
  ignoreUndefined: true,
}

export const createMongoClient = (uri, options = {}) => new MongoClient(uri, { ...CLIENT_OPTIONS, ...options })
