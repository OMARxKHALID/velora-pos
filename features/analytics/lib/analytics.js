import { indexCatalog } from "@/features/catalog/lib/catalog"
import { netRevenue } from "@/features/pricing/lib/pricing"
import { sumBy } from "@/lib/money"

const DAY = 24 * 60 * 60 * 1000
const time = (at) => new Date(at).getTime()

export const periodFor = (range, now = Date.now()) => {
  const today = new Date(now).setHours(0, 0, 0, 0)
  const days = { today: 1, "7d": 7, "30d": 30 }[range]
  const from = today - (days - 1) * DAY
  return { from, to: now, prevFrom: from - days * DAY, prevTo: from - days * DAY + (now - from), days }
}

export const within = (list, key, from, to) => list.filter((item) => time(item[key]) >= from && time(item[key]) < to)

const itemProfit = ({ total, unitCost, quantity }) => total - unitCost * quantity

const refundImpact = (state, refund) => {
  const sale = state.sales.find(({ id }) => id === refund.saleId)
  const profit = sumBy(refund.items, ({ variantId, quantity, amount, restock }) => {
    const unitCost = sale?.items.find((item) => item.variantId === variantId)?.unitCost ?? 0
    return amount - (restock ? unitCost * quantity : 0)
  })
  return { revenue: refund.total, profit }
}

export const summarize = (state, from, to) => {
  const sales = within(state.sales, "soldAt", from, to)
  const refunds = within(
    state.refunds.filter(({ status }) => status === "approved"),
    "decidedAt",
    from,
    to
  )
  const impacts = refunds.map((refund) => refundImpact(state, refund))
  const grossRevenue = sumBy(sales, netRevenue)
  const revenue = grossRevenue - sumBy(impacts, ({ revenue: amount }) => amount)
  const profit = sumBy(sales, ({ items }) => sumBy(items, itemProfit)) - sumBy(impacts, ({ profit: amount }) => amount)

  return {
    sales,
    refunds,
    revenue,
    profit,
    margin: revenue > 0 ? profit / revenue : 0,
    count: sales.length,
    basket: sales.length ? Math.round(grossRevenue / sales.length) : 0,
    pairs: sumBy(sales, ({ items }) => sumBy(items, ({ quantity }) => quantity)),
  }
}

export const dailySeries = (sales, from, days) =>
  Array.from({ length: days }, (_, index) => {
    const start = from + index * DAY
    const inDay = within(sales, "soldAt", start, start + DAY)
    return {
      day: start,
      revenue: sumBy(inDay, netRevenue) / 100,
      profit: sumBy(inDay, ({ items }) => sumBy(items, itemProfit)) / 100,
    }
  })

export const hourlySeries = (sales, fromHour = 10, toHour = 22) =>
  Array.from({ length: toHour - fromHour }, (_, index) => {
    const hour = fromHour + index
    const inHour = sales.filter(({ soldAt }) => new Date(soldAt).getHours() === hour)
    return {
      hour,
      sales: inHour.length,
      revenue: sumBy(inHour, netRevenue) / 100,
      profit: sumBy(inHour, ({ items }) => sumBy(items, itemProfit)) / 100,
    }
  })

export const productPerformance = (state, sales) => {
  const { productById, variantById, variantsByProduct } = indexCatalog(state)
  const sold = {}
  for (const sale of sales) {
    for (const item of sale.items) {
      const productId = variantById[item.variantId]?.productId
      sold[productId] ??= { pairs: 0, revenue: 0 }
      sold[productId].pairs += item.quantity
      sold[productId].revenue += item.total
    }
  }

  return state.products
    .filter(({ status }) => status === "active")
    .map((product) => ({
      product,
      pairs: sold[product.id]?.pairs ?? 0,
      revenue: sold[product.id]?.revenue ?? 0,
      stock: sumBy((variantsByProduct[product.id] ?? []).filter(({ active }) => active), ({ id }) => Math.max(state.stock[id] ?? 0, 0)),
    }))
    .filter(({ product }) => productById[product.id])
}

export const lowStock = (state) => {
  const { productById } = indexCatalog(state)
  return state.variants
    .filter((variant) => variant.active && productById[variant.productId]?.status === "active" && (state.stock[variant.id] ?? 0) <= variant.lowStockAt)
    .map((variant) => ({ variant, product: productById[variant.productId], quantity: state.stock[variant.id] ?? 0 }))
    .toSorted((a, b) => a.quantity - b.quantity)
}

export const cashierStats = (state, sales, refunds, from, to, cashierIds) => {
  const shifts = within(state.shifts.filter(({ status }) => status === "closed"), "closedAt", from, to)
  return cashierIds.map((cashierId) => {
    const mine = sales.filter((sale) => sale.cashierId === cashierId)
    const gross = sumBy(mine, ({ subtotal }) => subtotal)
    const discounts = sumBy(mine, ({ discountTotal }) => discountTotal)
    const myRefunds = refunds.filter(({ requestedBy }) => requestedBy === cashierId)
    const myShifts = shifts.filter((shift) => shift.cashierId === cashierId)
    const revenue = sumBy(mine, netRevenue)
    return {
      cashierId,
      count: mine.length,
      revenue,
      discountRate: gross ? discounts / gross : 0,
      bigDiscounts: mine.filter(({ flags }) => flags.includes("big_discount")).length,
      refundCount: myRefunds.length,
      refundRate: revenue ? sumBy(myRefunds, ({ total }) => total) / revenue : 0,
      cashDifference: sumBy(myShifts, ({ difference }) => difference),
      shortShifts: myShifts.filter(({ difference }) => difference < 0).length,
      shiftCount: myShifts.length,
      manualEntries: sumBy(mine, ({ items }) => items.filter(({ entry }) => entry === "manual").length),
    }
  })
}

export const signalsFor = (stats) =>
  [
    stats.discountRate > 0.025 && { tone: "warning", label: "High discounts" },
    stats.refundRate > 0.03 && { tone: "warning", label: "Frequent refunds" },
    stats.shortShifts > 1 && { tone: "destructive", label: "Cash short" },
  ].filter(Boolean)

export const brandPerformance = (state, sales) => {
  const { productById, variantById } = indexCatalog(state)
  const brands = {}
  for (const sale of sales) {
    for (const item of sale.items) {
      const brand = productById[variantById[item.variantId]?.productId]?.brand ?? "Other"
      brands[brand] ??= { brand, revenue: 0, pairs: 0 }
      brands[brand].revenue += item.total
      brands[brand].pairs += item.quantity
    }
  }
  return Object.values(brands).toSorted((a, b) => b.revenue - a.revenue)
}

export const notSelling = (state, days = 14, now = Date.now()) => {
  const since = within(state.sales, "soldAt", now - days * DAY, now)
  return productPerformance(state, since)
    .filter(({ pairs, stock }) => pairs === 0 && stock > 0)
    .map((row) => ({ ...row, value: row.stock * row.product.cost }))
    .toSorted((a, b) => b.value - a.value)
}

export const paymentSplit = (sales) => {
  const cash = sumBy(sales, ({ payments, change }) => sumBy(payments.filter(({ method }) => method === "cash"), ({ amount }) => amount) - change)
  const card = sumBy(sales, ({ payments }) => sumBy(payments.filter(({ method }) => method === "card"), ({ amount }) => amount))
  return { cash, card, cashShare: cash + card ? cash / (cash + card) : 0 }
}

export const stockValue = (state) => {
  const { variantById } = indexCatalog(state)
  const rows = Object.entries(state.stock).filter(([id, quantity]) => quantity > 0 && variantById[id]?.active)
  return { value: sumBy(rows, ([id, quantity]) => quantity * variantById[id].cost), pairs: sumBy(rows, ([, quantity]) => quantity) }
}
