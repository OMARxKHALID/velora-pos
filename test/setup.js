import { mock } from "bun:test"

// `server-only` is resolved by Next.js itself at build time. Under bun it does not exist, so stub it for tests.
mock.module("server-only", () => ({}))
