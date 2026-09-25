import { CATEGORY_ICONS, PCT_PATTERN, SHOP_ID, SIZE_TYPES, categoriesFromProducts, categoryFor, compareSizes, indexCatalog, makeCategory, makeVariant, pctCodeFor, variantKey } from "./catalog"
import { applyPurchase } from "@/features/demo/lib/ledger"
import { newId } from "@/lib/id"

const sameText = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()

const usedVariantIds = (state) => new Set(state.movements.map(({ variantId }) => variantId))

export const findProduct = (state, name, brand) => state.products.find((product) => sameText(product.name, name) && sameText(product.brand, brand))

export const applySaveProduct = (state, { productId = null, input: { shopId = SHOP_ID, ...input }, barcodes = {} }) => {
  const duplicate = findProduct(state, input.name, input.brand)
  if (duplicate && duplicate.id !== productId) throw new Error(`${input.brand} ${input.name} already exists`)
  if (!input.colors.length || !input.sizes.length) throw new Error("Add at least one colour and one size")
  if (input.cost > input.price) throw new Error("Cost cannot be higher than the price")

  const existing = productId ? state.products.find(({ id }) => id === productId) : null
  if (productId && !existing) throw new Error("Product not found")

  const productSeq = existing ? state.productSeq : state.productSeq + 1
  const product = {
    ...(existing ?? { id: `p-${String(productSeq).padStart(2, "0")}`, code: String(productSeq).padStart(2, "0"), shopId, popularity: 3, status: "active" }),
    ...input,
    discountPct: input.discountPct ?? existing?.discountPct ?? 0,
    pctCode: input.pctCode || existing?.pctCode || pctCodeFor(state.categories, input.category),
    sizes: input.sizes.map(String),
  }

  const { variantsByProduct, variantByBarcode } = indexCatalog(state)
  const current = variantsByProduct[product.id] ?? []
  const used = usedVariantIds(state)
  let barcodeSeq = state.barcodeSeq

  const wanted = product.colors.flatMap((color) => product.sizes.map((size) => ({ color, size, id: variantKey(product.id, color, size) })))
  const wantedIds = new Set(wanted.map(({ id }) => id))

  const claimed = {}
  const kept = wanted.map(({ color, size, id }) => {
    const found = current.find((variant) => variant.id === id)
    const base = found ?? makeVariant(product, color, size, (barcodeSeq += 1))
    const barcode = barcodes[id] ?? base.barcode
    const owner = variantByBarcode[barcode]
    if (owner && owner.id !== id) throw new Error(`Barcode ${barcode} already belongs to ${owner.sku}`)
    if (claimed[barcode]) throw new Error(`Barcode ${barcode} is used twice (${claimed[barcode]} and ${base.sku})`)
    claimed[barcode] = base.sku
    return { ...base, price: product.price, cost: product.cost, barcode, active: true }
  })

  const retired = current.filter(({ id }) => !wantedIds.has(id) && used.has(id)).map((variant) => ({ ...variant, active: false }))

  return {
    state: {
      ...state,
      productSeq,
      barcodeSeq,
      products: existing ? state.products.map((item) => (item.id === product.id ? product : item)) : [...state.products, product],
      variants: [...state.variants.filter(({ productId: owner }) => owner !== product.id), ...kept, ...retired],
    },
    record: product,
  }
}

export const applySetProductStatus = (state, { productId, status }) => {
  if (!["active", "archived"].includes(status)) throw new Error("Unknown status")
  const product = state.products.find(({ id }) => id === productId)
  if (!product) throw new Error("Product not found")
  const updated = { ...product, status }
  return { state: { ...state, products: state.products.map((item) => (item.id === productId ? updated : item)) }, record: updated }
}

export const canDeleteProduct = (state, productId) => {
  const used = usedVariantIds(state)
  return !state.variants.some((variant) => variant.productId === productId && used.has(variant.id))
}

export const applyDeleteProduct = (state, { productId }) => {
  if (!canDeleteProduct(state, productId)) throw new Error("This product has stock history. Archive it instead.")
  return {
    state: {
      ...state,
      products: state.products.filter(({ id }) => id !== productId),
      variants: state.variants.filter((variant) => variant.productId !== productId),
    },
    record: productId,
  }
}

export const applyImportCatalog = (state, { rows, userId, at, shopId = SHOP_ID }) => {
  const groups = Object.values(Object.groupBy(rows, ({ product, brand }) => `${product.toLowerCase()}|${brand.toLowerCase()}`))
  let next = {
    ...state,
    categories: categoriesFromProducts(
      groups.map((group) => ({ category: group[0].category, sizes: group.map(({ size }) => String(size)) })),
      state.categories
    ),
  }
  let created = 0
  let updated = 0

  for (const group of groups) {
    const [first] = group
    const existing = findProduct(next, first.product, first.brand)
    const colors = [...new Set([...(existing?.colors ?? []), ...group.map(({ color }) => color)])]
    const sizes = [...new Set([...(existing?.sizes ?? []), ...group.map(({ size }) => String(size))])].toSorted(compareSizes)
    const productId = existing?.id ?? null
    const pendingId = productId ?? `p-${String(next.productSeq + 1).padStart(2, "0")}`
    const barcodes = Object.fromEntries(group.filter(({ barcode }) => barcode).map(({ color, size, barcode }) => [variantKey(pendingId, color, size), barcode]))

    const result = applySaveProduct(next, {
      productId,
      barcodes,
      input: {
        shopId,
        name: existing?.name ?? first.product,
        brand: existing?.brand ?? first.brand,
        category: first.category,
        audience: first.audience,
        price: first.price,
        cost: first.cost,
        pctCode: first.pctCode || existing?.pctCode,
        colors,
        sizes,
      },
    })
    next = result.state
    existing ? (updated += 1) : (created += 1)
  }

  const stockLines = rows
    .filter(({ stock }) => stock > 0)
    .map((row) => {
      const product = findProduct(next, row.product, row.brand)
      const variantId = variantKey(product.id, row.color, row.size)
      return { variantId, quantity: row.stock, unitCost: product.cost }
    })

  if (stockLines.length) next = applyPurchase(next, { lines: stockLines, supplier: "CSV import", receivedBy: userId, at }).state

  return { state: next, record: { created, updated, pairs: stockLines.reduce((sum, { quantity }) => sum + quantity, 0) } }
}

const inCategory = (products, category) => products.filter((product) => product.category.toLowerCase() === category.name.toLowerCase())

export const applySaveCategory = (state, { categoryId = null, name, sizeType, icon, pctCode = "", lowStockAt = null }) => {
  const cleanName = name?.trim().replace(/\s+/g, " ") ?? ""
  if (!cleanName || cleanName.length > 30) throw new Error("Enter a category name, up to 30 characters")
  if (!SIZE_TYPES[sizeType]) throw new Error("Pick how this category is sized")
  if (!CATEGORY_ICONS.includes(icon)) throw new Error("Pick an icon")
  if (pctCode && !PCT_PATTERN.test(pctCode)) throw new Error("Use the 8-digit PCT code, like 6403.9900")
  const limit = lowStockAt === "" || lowStockAt === null ? null : Number(lowStockAt)
  if (limit !== null && (!Number.isInteger(limit) || limit < 0 || limit > 999)) throw new Error("Low-stock warning must be a whole number from 0 to 999")

  const existing = categoryId ? state.categories.find(({ id }) => id === categoryId) : null
  if (categoryId && !existing) throw new Error("Category not found")
  const clash = categoryFor(state.categories, cleanName)
  if (clash && clash.id !== categoryId) throw new Error(`${cleanName} already exists`)
  const used = existing ? inCategory(state.products, existing) : []
  if (existing && existing.sizeType !== sizeType && used.length) throw new Error("Products already use this category's sizes. Make a new category instead.")

  const record = existing
    ? { ...existing, name: cleanName, sizeType, icon, pctCode, lowStockAt: limit }
    : { ...makeCategory({ name: cleanName, sizeType, icon, pctCode }), lowStockAt: limit, id: `c-${newId().slice(0, 8)}` }
  const renamed = new Set(used.map(({ id }) => id))

  return {
    state: {
      ...state,
      categories: existing ? state.categories.map((category) => (category.id === categoryId ? record : category)) : [...state.categories, record],
      products: state.products.map((product) => (renamed.has(product.id) ? { ...product, category: cleanName } : product)),
    },
    record,
  }
}

export const applyDeleteCategory = (state, { categoryId }) => {
  const category = state.categories.find(({ id }) => id === categoryId)
  if (!category) throw new Error("Category not found")
  const used = inCategory(state.products, category).length
  if (used) throw new Error(`${used} ${used === 1 ? "product uses" : "products use"} this category. Move them first.`)
  return { state: { ...state, categories: state.categories.filter(({ id }) => id !== categoryId) }, record: categoryId }
}
