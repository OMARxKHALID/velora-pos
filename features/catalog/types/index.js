import { footwear } from "./footwear"

export const PRODUCT_TYPES = { footwear }

export const productTypeFor = (type) => {
  const definition = PRODUCT_TYPES[type]
  if (!definition) throw new Error(`Unknown product type: ${type}`)
  return definition
}
