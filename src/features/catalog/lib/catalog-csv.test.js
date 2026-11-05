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

test("one product cannot carry two prices", () => {
  const csv = ["product,brand,category,audience,color,size,price,cost", "Crest,Velora,Sneakers,men,Black,42,13500,6000", "Crest,Velora,Sneakers,men,Black,43,14000,6000"].join("\n")
  const { errors } = parseCatalogImport(csv)
  expect(errors.map(({ message }) => message).join()).toMatch("different prices")
})

test("a 5,000 row import parses cleanly and quickly, with no false duplicate flags", () => {
  const rows = ["product,brand,category,audience,color,size,price,cost,barcode"]
  for (let product = 0; product < 500; product += 1) {
    for (let size = 40; size < 50; size += 1) {
      rows.push(`Velora Style ${product},Velora,Sneakers,men,Black,${size},13500,6000,`)
    }
  }
  const started = performance.now()
  const { rows: parsed, errors, total } = parseCatalogImport(rows.join("\n"))
  expect(performance.now() - started).toBeLessThan(2000)
  expect(total).toBe(5000)
  expect(parsed).toHaveLength(5000)
  expect(errors).toEqual([])
})

test("a spreadsheet-formula product name imports as plain text, never as a formula", () => {
  const csv = ["product,brand,category,audience,color,size,price,cost", '=HYPERLINK("http://x"),Velora,Sneakers,men,Black,42,13500,6000'].join("\n")
  const { rows, errors } = parseCatalogImport(csv)
  expect(errors).toEqual([])
  expect(rows[0].product).toBe('=HYPERLINK("http://x")')
})
