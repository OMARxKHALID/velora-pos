import { sumBy } from "@/lib/money"

export const stockRows = (stock, { products, variantsByProduct }, threshold = null) =>
  products
    .filter(({ status }) => status === "active")
    .flatMap((product) =>
      product.colors.map((color) => {
        const sizes = variantsByProduct[product.id]
          .filter(
            ({ attributes, active }) => active && attributes.color === color
          )
          .map((variant) => ({ variant, quantity: stock[variant.id] ?? 0 }))
        const total = sumBy(sizes, ({ quantity }) => quantity)
        const getLowLimit = (variant) => (threshold !== null && Number.isFinite(threshold) ? threshold : variant.lowStockAt)
        return {
          key: `${product.id}-${color}`,
          product,
          color,
          sizes,
          total,
          value: total * product.cost,
          low: sizes.filter(
            ({ variant, quantity }) =>
              quantity > 0 && quantity <= getLowLimit(variant)
          ).length,
          out: sizes.filter(({ quantity }) => quantity <= 0).length,
        }
      })
    )
