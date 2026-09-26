import { expect, test } from "bun:test"
import { createSeed } from "@/features/sample-data/lib/seed"
import { exportCatalogCsv, importTemplateCsv, parseCatalogImport } from "./catalog-csv"

test("re-importing an export is clean and never adds stock", () => {
  const parsed = parseCatalogImport(exportCatalogCsv(createSeed()))
  expect(parsed.errors).toEqual([])
  expect(parsed.rows).toHaveLength(334)
  expect(parsed.rows.every(({ stock }) => stock === 0)).toBe(true)
})

test("template imports with receive quantities and rejects bad rows", () => {
  expect(parseCatalogImport(importTemplateCsv()).rows.map(({ stock }) => stock)).toEqual([4, 4, 2])
  const bad = parseCatalogImport("product,brand,category,audience,color,size,price,cost\nX,Velora,Boots,men,Black,42,100,500")
  expect(bad.errors[0].message).toContain("cost is higher than price")
})
