import { expect, test } from "bun:test"
import { MAX_REFERENCE, referenceError } from "./card-reference"

test("approval codes are length checked", () => {
  expect(referenceError("048291")).toBeNull()
  expect(referenceError(` ${"x".repeat(MAX_REFERENCE)} `)).toBeNull()
  expect(referenceError("x".repeat(MAX_REFERENCE + 1))).toContain("under")
})
