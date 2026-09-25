import { execFileSync } from "node:child_process"
import { test as setup } from "@playwright/test"
import { E2E_ENV } from "../playwright.config"

setup("load fresh sample data into the e2e database", () => {
  execFileSync("bun", ["scripts/db-seed.js", "--reset"], { env: { ...process.env, ...E2E_ENV }, stdio: "pipe" })
})
