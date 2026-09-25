export const fitToStock = (lines, stock) => {
  const adjusted = []
  const fitted = lines.flatMap((line) => {
    const available = Math.max(stock[line.variantId] ?? 0, 0)
    if (line.quantity <= available) return [line]
    adjusted.push({ variantId: line.variantId, wanted: line.quantity, kept: available })
    return available > 0 ? [{ ...line, quantity: available }] : []
  })
  return { lines: fitted, adjusted }
}
