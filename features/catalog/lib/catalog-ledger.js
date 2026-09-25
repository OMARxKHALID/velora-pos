import { SHOP_ID, indexCatalog, makeVariant, sameColor, variantKey } from "./catalog"
import { applyPurchase } from "@/features/demo/lib/ledger"

const sameText = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()

const usedVariantIds = (state) => new Set(state.movements.map(({ variantId }) => variantId))

export const findProduct = (state, name, brand) => state.products.find((product) => sameText(product.name, name) && sameText(product.brand, brand))

export const applySaveProduct = (state, { productId = null, input, barcodes = {} }) => {
  const duplicate = findProduct(state, input.name, input.brand)
  if (duplicate && duplicate.id !== productId) throw new Error(`${input.brand} ${input.name} already exists`)
  if (!input.colors.length || !input.sizes.length) throw new Error("Add at least one colour and one size")
  if (input.cost > input.price) throw new Error("Cost cannot be higher than the price")
  const clash = input.colors.flatMap((color, index) => input.colors.slice(index + 1).filter((other) => sameColor(other, color)).map((other) => [color, other]))[0]
  if (clash) throw new Error(`${clash[0]} and ${clash[1]} are the same colour`)

  const existing = productId ? state.products.find(({ id }) => id === productId) : null
  if (productId && !existing) throw new Error("Product not found")

  const productSeq = existing ? state.productSeq : state.productSeq + 1
  const product = {
    ...(existing ?? { id: `p-${String(productSeq).padStart(2, "0")}`, code: String(productSeq).padStart(2, "0"), shopId: SHOP_ID, productType: "footwear", popularity: 3, status: "active" }),
    ...input,
    discountPct: input.discountPct ?? existing?.discountPct ?? 0,
    sizes: input.sizes.map(String),
  }

  const { variantsByProduct, variantByBarcode } = indexCatalog(state)
  const current = variantsByProduct[product.id] ?? []
  const used = usedVariantIds(state)
  let barcodeSeq = state.barcodeSeq

  const wanted = product.colors.flatMap((color) => product.sizes.map((size) => ({ color, size, id: variantKey(product.id, color, size) })))
  const wantedIds = new Set(wanted.map(({ id }) => id))
  if (wantedIds.size !== wanted.length) throw new Error("Each size can only be listed once")

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

export const applyImportCatalog = (state, { rows, userId, at }) => {
  const groups = Object.values(Object.groupBy(rows, ({ product, brand }) => `${product.toLowerCase()}|${brand.toLowerCase()}`))
  let next = state
  let created = 0
  let updated = 0

  for (const group of groups) {
    const [first] = group
    const existing = findProduct(next, first.product, first.brand)
    const colors = [...(existing?.colors ?? []), ...group.map(({ color }) => color)].reduce(
      (list, color) => (list.some((known) => sameColor(known, color)) ? list : [...list, color]),
      []
    )
    const sizes = [...new Set([...(existing?.sizes ?? []), ...group.map(({ size }) => String(size))])].toSorted((a, b) => Number(a) - Number(b))
    const productId = existing?.id ?? null
    const pendingId = productId ?? `p-${String(next.productSeq + 1).padStart(2, "0")}`
    const barcodes = Object.fromEntries(group.filter(({ barcode }) => barcode).map(({ color, size, barcode }) => [variantKey(pendingId, color, size), barcode]))

    const result = applySaveProduct(next, {
      productId,
      barcodes,
      input: {
        name: existing?.name ?? first.product,
        brand: existing?.brand ?? first.brand,
        category: first.category,
        audience: first.audience,
        price: first.price,
        cost: first.cost,
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
