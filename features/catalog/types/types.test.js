import { expect, test } from "bun:test"
import { PRODUCT_TYPES, productTypeFor } from "."

test("the registry knows footwear and nothing else yet", () => {
  expect(Object.keys(PRODUCT_TYPES)).toEqual(["footwear"])
  expect(() => productTypeFor("cosmetics")).toThrow("Unknown product type")
})

test("footwear variants are colour × EU size with readable labels", () => {
  const footwear = productTypeFor("footwear")
  const product = { id: "p-99", code: "99", colors: ["Black", "Brown"], sizes: ["42", "41"], price: 100, cost: 50 }
  expect(footwear.variantOptions(product)).toEqual([
    { color: "Black", size: "42" },
    { color: "Black", size: "41" },
    { color: "Brown", size: "42" },
    { color: "Brown", size: "41" },
  ])
  expect(footwear.variantId("p-99", { color: "Black", size: "42" })).toBe("p-99-BLACK-42")
  expect(footwear.newVariant(product, { color: "Brown", size: "41" }, 7)).toMatchObject({ id: "p-99-BROWN-41", sku: "VS-99-BROWN-41" })
  expect(footwear.labelFor({ color: "Black/Gold", size: "40" })).toBe("Black/Gold · EU 40")
})

test("footwear fields are checked: colours, sizes and audience", () => {
  const { fieldsSchema } = productTypeFor("footwear")
  const ok = fieldsSchema.safeParse({ category: "Sneakers", audience: "men", colors: ["Black"], sizes: ["43", "41"] })
  expect(ok.data.sizes).toEqual(["41", "43"])
  expect(fieldsSchema.safeParse({ category: "Sneakers", audience: "men", colors: ["Navy Blue", "navy-blue"], sizes: ["41"] }).error.issues[0].message).toMatch("same colour")
  expect(fieldsSchema.safeParse({ category: "Sneakers", audience: "men", colors: ["Black"], sizes: ["41", "41"] }).error.issues[0].message).toMatch("only be listed once")
  expect(fieldsSchema.safeParse({ category: "Sneakers", audience: "pets", colors: ["Black"], sizes: ["41"] }).success).toBe(false)
  expect(fieldsSchema.safeParse({ category: "Sneakers", audience: "men", colors: ["Black"], sizes: ["XL"] }).success).toBe(false)
})
