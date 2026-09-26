"use client"

import { QueryClient, QueryClientProvider, environmentManager } from "@tanstack/react-query"

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 15_000, retry: 1 },
    },
  })

let browserQueryClient

const getQueryClient = () => {
  if (environmentManager.isServer()) return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export const QueryProvider = ({ children }) => <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>
