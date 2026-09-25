import { sumBy } from "@/lib/money"
import { lowLimitFor } from "@/features/catalog/lib/catalog"

export const stockRows = (stock, { products, variantsByProduct }, threshold = null, categories = []) => {
  const shopLimit = (product) => (typeof threshold === "function" ? threshold(product.shopId) : threshold)
  const limitFor = (product, variant) => lowLimitFor(categories, product.category, Number.isFinite(shopLimit(product)) ? shopLimit(product) : variant.lowStockAt)

  return products
    .filter(({ status }) => status === "active")
    .flatMap((product) =>
      product.colors.map((color) => {
        const sizes = (variantsByProduct[product.id] ?? [])
          .filter(({ attributes, active }) => active && attributes.color === color)
          .map((variant) => ({ variant, quantity: stock[variant.id] ?? 0 }))
        const total = sumBy(sizes, ({ quantity }) => quantity)
        return {
          key: `${product.id}-${color}`,
          limit: lowLimitFor(categories, product.category, Number.isFinite(shopLimit(product)) ? shopLimit(product) : 2),
          product,
          color,
          sizes,
          total,
          value: total * product.cost,
          low: sizes.filter(({ variant, quantity }) => quantity > 0 && quantity <= limitFor(product, variant)).length,
          out: sizes.filter(({ quantity }) => quantity <= 0).length,
        }
      })
    )
}
