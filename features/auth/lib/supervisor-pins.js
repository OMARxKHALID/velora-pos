import "server-only"
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { appEnv } from "@/lib/env"
import { USER_ID_PATTERN } from "./session-cookie"

export const PIN_PATTERN = /^\d{4}$/
export const DEFAULT_PINS = { "u-manager": "1234" }
const MAX_ENTRIES = 20
const DEMO_SECRET = "velora-demo-pin-secret"

const secret = () => appEnv().PIN_SECRET ?? DEMO_SECRET

const derive = (userId, pin, salt) =>
  scryptSync(createHmac("sha256", secret()).update(`${userId}:${pin}`).digest(), salt, 32, { N: 16384, r: 8, p: 1 })

export const hashPin = (userId, pin) => {
  const salt = randomBytes(16)
  return `${salt.toString("base64url")}.${derive(userId, pin, salt).toString("base64url")}`
}

const matches = (stored, userId, pin) => {
  const [salt, hash] = typeof stored === "string" ? stored.split(".") : []
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, "base64url")
  const actual = derive(userId, pin, Buffer.from(salt, "base64url"))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export const checkPin = (pins, userId, pin) => {
  if (!PIN_PATTERN.test(pin ?? "")) return false
  if (pins[userId]) return matches(pins[userId], userId, pin)
  return DEFAULT_PINS[userId] === pin
}

export const hasPin = (pins, userId) => Boolean(pins[userId] || DEFAULT_PINS[userId])

export const pinHolders = (pins) => [...new Set([...Object.keys(pins), ...Object.keys(DEFAULT_PINS)])]

export const parsePins = (raw) => {
  if (!raw) return {}
  try {
    const data = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"))
    return Object.fromEntries(
      Object.entries(data ?? {})
        .filter(([id, value]) => USER_ID_PATTERN.test(id) && typeof value === "string" && value.length < 120)
        .slice(0, MAX_ENTRIES)
    )
  } catch {
    return {}
  }
}

export const serializePins = (pins) => Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(pins).slice(-MAX_ENTRIES)))).toString("base64url")
