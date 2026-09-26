import { CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist"
import { PAGE_CACHES } from "../features/offline/lib/cache-names"

const WEEK = 7 * 24 * 60 * 60

const pages = (cacheName) =>
  new NetworkFirst({ cacheName, networkTimeoutSeconds: 4, plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: WEEK })] })

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    { matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/"), handler: new NetworkOnly() },
    { matcher: ({ sameOrigin, request }) => sameOrigin && request.headers.get("RSC") === "1", handler: pages(PAGE_CACHES.rsc) },
    { matcher: ({ sameOrigin, request }) => sameOrigin && request.mode === "navigate", handler: pages(PAGE_CACHES.html) },
    { matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/_next/static/"), handler: new CacheFirst({ cacheName: "velora-static", plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 5 * WEEK })] }) },
    {
      matcher: ({ sameOrigin, request }) => sameOrigin && ["image", "font", "style", "script"].includes(request.destination),
      handler: new StaleWhileRevalidate({ cacheName: "velora-assets", plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: WEEK })] }),
    },
  ],
  fallbacks: {
    entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }],
  },
})

serwist.addEventListeners()
