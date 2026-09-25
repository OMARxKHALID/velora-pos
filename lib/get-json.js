import { parseLedger } from "@/features/ledger/store/ledger-store"

export const getJson = async (url, { signal } = {}) => {
  const response = await fetch(url, { cache: "no-store", signal })
  if (response.status === 401) throw new Error("Your session has ended. Sign in again.")
  const body = parseLedger(await response.text())
  if (!response.ok) throw new Error(body?.error ?? "Could not load this. Try again.")
  return body
}

export const queryString = (params) => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")).toString()
