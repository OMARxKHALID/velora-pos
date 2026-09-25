"use client"

import { SerwistProvider } from "@serwist/turbopack/react"

export const ServiceWorkerProvider = ({ children }) => (
  <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV !== "production"} reloadOnOnline={false}>
    {children}
  </SerwistProvider>
)
