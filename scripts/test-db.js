import { spawn } from "bun"
import { MongoMemoryReplSet } from "mongodb-memory-server"

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" }, binary: { version: "8.0.4" } })
await replSet.waitUntilRunning()

const tests = spawn(["bun", "test", ...process.argv.slice(2)], {
  env: { ...process.env, MONGODB_TEST_URI: replSet.getUri() },
  stdout: "inherit",
  stderr: "inherit",
})

const code = await tests.exited
await replSet.stop()
process.exit(code)
