import { describe, expect, test } from "bun:test"
import { seedCatalog } from "@/features/catalog/lib/catalog"
import { defaultPricingSettings } from "./pricing"
import { cartTotals, lineDiscount, netRevenue } from "./pricing"

const catalog = seedCatalog()
const index = {
  productById: Object.fromEntries(catalog.products.map((product) => [product.id, product])),
  variantById: Object.fromEntries(catalog.variants.map((variant) => [variant.id, variant])),
}
const settings = defaultPricingSettings()
const variant = catalog.variants[0]
const product = catalog.products[0]

describe("pricing", () => {
  test("tax is off by default and leaves the total unchanged", () => {
    const totals = cartTotals([{ variantId: variant.id, quantity: 2 }], 0, index, settings)
    expect(totals.subtotal).toBe(variant.price * 2)
    expect(totals.taxRate).toBe(0)
    expect(totals.taxTotal).toBe(0)
    expect(totals.total).toBe(variant.price * 2)
  })

  test("a tax rate adds tax on top of the discounted net", () => {
    const withTax = cartTotals([{ variantId: variant.id, quantity: 1 }], 0, index, { ...settings, taxEnabled: true, taxRate: 15 })
    expect(withTax.taxTotal).toBe(Math.round((variant.price * 15) / 100))
    expect(withTax.total).toBe(variant.price + withTax.taxTotal)
  })

  test("per-product discount applies when enabled and is skipped when disabled", () => {
    const discounted = { ...product, discountPct: 10 }
    const withPct = { ...index, productById: { ...index.productById, [product.id]: discounted } }
    const on = cartTotals([{ variantId: variant.id, quantity: 1 }], 0, withPct, settings)
    expect(on.rows[0].productDiscount).toBe(lineDiscount(variant.price, 10))
    expect(on.discountTotal).toBe(on.rows[0].productDiscount)

    const off = cartTotals([{ variantId: variant.id, quantity: 1 }], 0, withPct, { ...settings, productDiscountEnabled: false })
    expect(off.rows[0].productDiscount).toBe(0)
    expect(off.total).toBe(variant.price)
  })

  test("cart discount can be switched off without touching product discounts", () => {
    const discounted = { ...product, discountPct: 5 }
    const withPct = { ...index, productById: { ...index.productById, [product.id]: discounted } }
    const totals = cartTotals([{ variantId: variant.id, quantity: 1 }], 10, withPct, { ...settings, cartDiscountEnabled: false })
    expect(totals.rows[0].discount).toBe(0)
    expect(totals.rows[0].productDiscount).toBe(lineDiscount(variant.price, 5))
  })

  test("netRevenue strips tax for reports", () => {
    expect(netRevenue({ total: 11500, taxTotal: 1500 })).toBe(10000)
    expect(netRevenue({ total: 10000 })).toBe(10000)
  })
})