import { expect, test } from "bun:test"
import { seedCatalog } from "./catalog"
import { colorValue, mostUsedColors, swatchStyle } from "./colors"

test("colour names resolve to swatches, including two-tone and fashion names", () => {
  expect(colorValue("Black")).toBe("#141414")
  expect(colorValue("  burgundy ")).toBe("#800020")
  expect(colorValue("Rose Gold")).toBe("#b76e79")
  expect(colorValue("zzz")).toBeNull()
  expect(swatchStyle("Black/Gold").background).toContain("linear-gradient")
  expect(swatchStyle("zzz")).toBeNull()
})

test("most used colours count each part of a two-tone name", () => {
  const top = mostUsedColors(seedCatalog().products, 3)
  expect(top[0]).toEqual({ color: "Black", count: expect.any(Number) })
  expect(top.map(({ count }) => count)).toEqual(top.map(({ count }) => count).toSorted((a, b) => b - a))
})
