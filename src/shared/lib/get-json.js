import { parseDatedJson } from "./dated-json"

export const getJson = async (url, { signal } = {}) => {
  const response = await fetch(url, { signal })
  if (response.status === 401) throw new Error("Your session has ended. Sign in again.")
  const body = parseDatedJson(await response.text())
  if (!response.ok) throw new Error(body?.error ?? "Could not load this. Try again.")
  return body
}

export const queryString = (params) => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")).toString()
