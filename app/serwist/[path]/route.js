import { randomUUID } from "node:crypto"
import { createSerwistRoute } from "@serwist/turbopack"

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "app/sw.js",
  useNativeEsbuild: true,
  additionalPrecacheEntries: [{ url: "/offline", revision: randomUUID() }],
})
