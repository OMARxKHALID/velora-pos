"use client"

import { QueryClient, QueryClientProvider, environmentManager } from "@tanstack/react-query"

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 15_000, retry: 1 },
    },
  })

let browser = null

const getQueryClient = (userId) => {
  if (environmentManager.isServer()) return makeQueryClient()
  if (browser?.userId === userId) return browser.client
  browser?.client.clear()
  browser = { userId, client: makeQueryClient() }
  return browser.client
}

export const QueryProvider = ({ userId, children }) => <QueryClientProvider client={getQueryClient(userId)}>{children}</QueryClientProvider>
