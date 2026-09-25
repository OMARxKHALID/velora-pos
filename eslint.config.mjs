import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import globals from "globals"

export default defineConfig([
  ...nextVitals,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.serviceworker } },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  { files: ["**/*.test.js", "**/*.test.jsx", "test/**"], languageOptions: { globals: { Bun: "readonly" } } },
  globalIgnores([".next/**", "out/**", "build/**", "playwright-report/**", "test-results/**"]),
])
