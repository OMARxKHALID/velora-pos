import { withSerwist } from "@serwist/turbopack"

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
]

const nextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: import.meta.dirname,
  },
  headers: async () => [
    { source: "/:path*", headers: securityHeaders },
    { source: "/serwist/:path*", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
  ],
}

export default withSerwist(nextConfig)
