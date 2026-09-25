export const planProductSave = ({ type, product, current, usedIds, barcodes = {}, barcodeOwner, nextSerial }) => {
  const wanted = type.variantOptions(product).map((options) => ({ options, id: type.variantId(product.id, options) }))
  const wantedIds = new Set(wanted.map(({ id }) => id))
  if (wantedIds.size !== wanted.length) throw new Error("Each size can only be listed once")

  const claimed = {}
  const keep = wanted.map(({ options, id }) => {
    const found = current.find((variant) => variant.id === id)
    const base = found ?? type.newVariant(product, options, nextSerial())
    const barcode = barcodes[id] ?? base.barcode
    const owner = barcodeOwner(barcode, id)
    if (owner) throw new Error(`Barcode ${barcode} already belongs to ${owner}`)
    if (claimed[barcode]) throw new Error(`Barcode ${barcode} is used twice (${claimed[barcode]} and ${base.sku})`)
    claimed[barcode] = base.sku
    return { ...base, price: product.price, cost: product.cost, barcode, active: true }
  })

  const leaving = current.filter(({ id }) => !wantedIds.has(id))
  return {
    keep,
    retire: leaving.filter(({ id }) => usedIds.has(id)).map((variant) => ({ ...variant, active: false })),
    remove: leaving.filter(({ id }) => !usedIds.has(id)).map(({ id }) => id),
  }
}
