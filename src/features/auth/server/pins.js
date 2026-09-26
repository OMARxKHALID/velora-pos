import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

export const PIN_PATTERN = /^\d{4}$/

const derive = (secret, userId, pin, salt) =>
  scryptSync(createHmac("sha256", secret).update(`${userId}:${pin}`).digest(), salt, 32, { N: 16384, r: 8, p: 1 })

export const hashPin = (secret, userId, pin) => {
  if (!PIN_PATTERN.test(pin ?? "")) throw new Error("The PIN must be 4 digits")
  const salt = randomBytes(16)
  return `${salt.toString("base64url")}.${derive(secret, userId, pin, salt).toString("base64url")}`
}

export const matchesPin = (secret, stored, userId, pin) => {
  if (!PIN_PATTERN.test(pin ?? "")) return false
  const [salt, hash] = typeof stored === "string" ? stored.split(".") : []
  if (!salt || !hash) return false
  const expected = Buffer.from(hash, "base64url")
  const actual = derive(secret, userId, pin, Buffer.from(salt, "base64url"))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
