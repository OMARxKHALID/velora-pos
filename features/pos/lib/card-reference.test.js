import { expect, test } from "bun:test"
import { MAX_REFERENCE, findSaleByReference, referenceError } from "./card-reference"

test("approval codes are length checked and repeats are found", () => {
  expect(referenceError("048291")).toBeNull()
  expect(referenceError("x".repeat(MAX_REFERENCE + 1))).toContain("under")
  const sales = [{ number: "SH1-R1-000001", payments: [{ method: "card", reference: "048291" }] }, { number: "SH1-R1-000002", payments: [{ method: "cash" }] }]
  expect(findSaleByReference(sales, " 048291 ")?.number).toBe("SH1-R1-000001")
  expect(findSaleByReference(sales, "111111")).toBeNull()
  expect(findSaleByReference(sales, "")).toBeNull()
})
