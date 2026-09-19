import { internalEan13 } from "./barcode"

export const SHOP_ID = "shop-shoes"
export const REGISTER_ID = "reg-1"
export const REGISTER_CODE = "SH1-R1"

const sizeRuns = {
  men: [39, 40, 41, 42, 43, 44, 45],
  women: [36, 37, 38, 39, 40, 41],
  unisex: [37, 38, 39, 40, 41, 42, 43, 44],
  kids: [28, 29, 30, 31, 32, 33, 34],
}

export const colorSwatches = {
  Black: "#141414",
  White: "#f5f5f0",
  Brown: "#6b4226",
  Tan: "#c19a6b",
  Gold: "#d4af37",
  Nude: "#e3bc9a",
  Beige: "#e8dcc4",
  Pink: "#f4a7b9",
  Grey: "#8e8e8e",
  Navy: "#1f2a44",
  Maroon: "#6d1f2c",
  Blue: "#2f6fd6",
  Red: "#c9302c",
  Olive: "#6b6b3a",
  "Black/Gold": "#141414",
  "White/Gold": "#f5f5f0",
  "White/Black": "#f5f5f0",
}

const catalog = [
  ["Velora Aurum Runner", "Velora", "Sneakers", "men", 12500, ["Black/Gold", "White/Gold"], 9],
  ["Velora Noir Oxford", "Velora", "Formal", "men", 18900, ["Black", "Brown"], 6],
  ["Velora Regent Loafer", "Velora", "Formal", "men", 16500, ["Tan", "Black"], 5],
  ["Velora Seraph Heel", "Velora", "Heels", "women", 14900, ["Black", "Nude", "Gold"], 7],
  ["Velora Lumière Flat", "Velora", "Flats", "women", 7900, ["Beige", "Black"], 6],
  ["Velora Petite Sneaker", "Velora", "Kids", "kids", 5900, ["White", "Pink"], 6],
  ["Nike Air Max 90", "Nike", "Sneakers", "men", 32000, ["White", "Black"], 8],
  ["Nike Revolution 7", "Nike", "Sports", "men", 17500, ["Black", "Grey"], 7],
  ["Nike Court Legacy", "Nike", "Sneakers", "women", 19500, ["White", "Pink"], 5],
  ["Adidas Samba OG", "Adidas", "Sneakers", "unisex", 29000, ["White/Black", "Black"], 8],
  ["Adidas Ultraboost Light", "Adidas", "Sports", "men", 42000, ["Black", "White"], 3],
  ["Adidas Grand Court Kids", "Adidas", "Kids", "kids", 9500, ["White", "Navy"], 4],
  ["Puma Smash v2", "Puma", "Sneakers", "unisex", 13500, ["White", "Black"], 5],
  ["Puma Softride Pro", "Puma", "Sports", "women", 15900, ["Pink", "Black"], 3],
  ["Bata Comfit Sandal", "Bata", "Sandals", "men", 4999, ["Brown", "Black"], 7],
  ["Bata Power Walker", "Bata", "Sports", "men", 7499, ["Grey", "Navy"], 5],
  ["Bata Red Label Pump", "Bata", "Heels", "women", 5999, ["Black", "Maroon"], 4],
  ["Servis Cheetah Kids", "Servis", "Kids", "kids", 3299, ["Blue", "Red"], 6],
  ["Servis Calza Peshawari", "Servis", "Traditional", "men", 6499, ["Brown", "Black"], 4],
  ["Velora Khussa Zari", "Velora", "Traditional", "women", 8900, ["Gold", "Maroon"], 5],
  ["Velora Monarch Chelsea Boot", "Velora", "Boots", "men", 21500, ["Black", "Brown"], 0],
  ["Velora Tide Slide", "Velora", "Sandals", "unisex", 3900, ["Black", "Olive"], 4],
  ["Skechers Go Walk 7", "Skechers", "Sports", "women", 18900, ["Navy", "Grey"], 3],
  ["Velora Scout Kids Boot", "Velora", "Kids", "kids", 7900, ["Brown", "Black"], 0],
]

const slug = (text) => text.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3)

export const sizePresets = sizeRuns

const colorCode = (color) => color.split("/").map(slug).join("")

export const variantKey = (productId, color, size) => `${productId}-${colorCode(color)}-${size}`

export const makeVariant = (product, color, size, serial) => ({
  id: variantKey(product.id, color, size),
  productId: product.id,
  sku: `VS-${product.code}-${colorCode(color)}-${size}`,
  barcode: internalEan13(serial),
  attributes: { color, size: String(size) },
  price: product.price,
  cost: product.cost,
  lowStockAt: 2,
  active: true,
})

export const seedCatalog = () => {
  const products = catalog.map(([name, brand, category, audience, rupees, colors, popularity], index) => ({
    id: `p-${String(index + 1).padStart(2, "0")}`,
    code: String(index + 1).padStart(2, "0"),
    shopId: SHOP_ID,
    productType: "footwear",
    name,
    brand,
    category,
    audience,
    colors,
    sizes: sizeRuns[audience].map(String),
    price: rupees * 100,
    cost: Math.round(rupees * 100 * (brand === "Velora" ? 0.45 : 0.7)),
    popularity,
    status: "active",
  }))

  let serial = 0
  const variants = products.flatMap((product) =>
    product.colors.flatMap((color) => product.sizes.map((size) => makeVariant(product, color, size, (serial += 1))))
  )

  return { products, variants, barcodeSeq: serial, productSeq: products.length }
}

const cache = new WeakMap()

export const indexCatalog = ({ products, variants }) => {
  const hit = cache.get(variants)
  if (hit?.products === products) return hit.index
  const index = {
    productById: Object.fromEntries(products.map((product) => [product.id, product])),
    variantById: Object.fromEntries(variants.map((variant) => [variant.id, variant])),
    variantByBarcode: Object.fromEntries(variants.map((variant) => [variant.barcode, variant])),
    variantsByProduct: Object.groupBy(variants, ({ productId }) => productId),
  }
  cache.set(variants, { products, index })
  return index
}
