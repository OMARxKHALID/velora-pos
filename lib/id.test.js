import { afterEach, expect, test } from "bun:test"
import { newId } from "./id"

const original = Object.getOwnPropertyDescriptor(globalThis, "crypto")

afterEach(() => Object.defineProperty(globalThis, "crypto", original))

test("newId returns v4 UUIDs, also without crypto.randomUUID", () => {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  expect(newId()).toMatch(uuid)

  Object.defineProperty(globalThis, "crypto", { value: { getRandomValues: original.value.getRandomValues.bind(original.value) }, configurable: true })
  const ids = new Set(Array.from({ length: 50 }, newId))
  expect(ids.size).toBe(50)
  for (const id of ids) expect(id).toMatch(uuid)

  Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true })
  expect(newId()).toMatch(uuid)
})
