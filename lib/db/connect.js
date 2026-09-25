import { MongoClient } from "mongodb"

export const CLIENT_OPTIONS = {
  appName: "velora-pos",
  maxPoolSize: 10,
  maxIdleTimeMS: 5000,
  serverSelectionTimeoutMS: 5000,
  ignoreUndefined: true,
}

export const createMongoClient = (uri, options = {}) => new MongoClient(uri, { ...CLIENT_OPTIONS, ...options })
