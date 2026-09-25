import { defineConfig, devices } from "@playwright/test"

const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`

export const E2E_ENV = {
  MONGODB_DB: "velora_e2e",
  SAMPLE_DATA: "true",
  SAMPLE_PASSWORD: "velora-sample",
  BETTER_AUTH_URL: BASE_URL,
}

const chromium = process.env.PLAYWRIGHT_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } } : {}

export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.e2e\.js/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: BASE_URL, trace: "retain-on-failure", ...chromium },
  projects: [
    { name: "sample data", testMatch: /sample-data\.setup\.js/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"], ...chromium }, dependencies: ["sample data"] },
  ],
  webServer: {
    command: `bun run start --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    env: E2E_ENV,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
