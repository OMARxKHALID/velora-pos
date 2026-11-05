import { expect, test } from "bun:test"
import { isBarcodeLike, stripSpaces } from "./barcode-input"

test("a typed barcode keeps letters and digits and drops spaces", () => {
  expect(stripSpaces(" 2000 0000 0046 ")).toBe("200000000046")
  expect(stripSpaces("AB-12 cd")).toBe("AB-12cd")
})

test("search text that looks like a barcode is told apart from a product name", () => {
  for (const code of ["2000000000046", "SKU-0042A", "123456"]) expect(isBarcodeLike(code)).toBe(true)
  for (const text of ["nike air", "sandal", "12345", "air max 90"]) expect(isBarcodeLike(text)).toBe(false)
})
