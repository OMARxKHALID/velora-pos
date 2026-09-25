import { expect, test } from "bun:test"
import { indexCatalog, seedCatalog } from "@/features/catalog/lib/catalog"
import { stockRows } from "./stock-rows"

test("one row per product colour, counting low and empty sizes", () => {
  const catalog = seedCatalog()
  const index = { products: catalog.products, variantsByProduct: indexCatalog(catalog).variantsByProduct }
  const [product] = catalog.products
  const [first, second] = index.variantsByProduct[product.id].filter(({ attributes }) => attributes.color === product.colors[0])
  const rows = stockRows({ [first.id]: 2, [second.id]: 9 }, index, 3)
  const row = rows.find(({ key }) => key === `${product.id}-${product.colors[0]}`)

  expect(rows).toHaveLength(catalog.products.reduce((sum, { colors }) => sum + colors.length, 0))
  expect(row.total).toBe(11)
  expect(row.value).toBe(11 * product.cost)
  expect(row.low).toBe(1)
  expect(row.out).toBe(row.sizes.length - 2)
  expect(stockRows({ [first.id]: 2 }, index).find(({ key }) => key === row.key).low).toBe(1)
})

test("archived products are left out", () => {
  const catalog = seedCatalog()
  const products = catalog.products.map((product, index) => (index === 0 ? { ...product, status: "archived" } : product))
  const rows = stockRows({}, { products, variantsByProduct: indexCatalog(catalog).variantsByProduct })
  expect(rows.some(({ product }) => product.id === products[0].id)).toBe(false)
})
