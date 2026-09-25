import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"

export default defineConfig([
  ...nextVitals,
  { rules: { "no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_", ignoreRestSiblings: true }] } },
  globalIgnores([".next/**", "out/**", "build/**", "playwright-report/**", "test-results/**"]),
])
