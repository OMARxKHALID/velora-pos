import { REGISTER_CODE, REGISTER_ID, SHOP_ID, indexCatalog } from "@/features/catalog/lib/catalog"
import { sumBy } from "@/lib/money"

export const MAX_CASHIER_DISCOUNT = 0.05

const pricingDefaults = { taxEnabled: false, taxRate: 0, productDiscountEnabled: true, cartDiscountEnabled: true }

export const emptyLedger = () => ({
  products: [],
  variants: [],
  barcodeSeq: 0,
  productSeq: 0,
  stock: {},
  movements: [],
  sales: [],
  refunds: [],
  shifts: [],
  purchases: [],
  outbox: [],
  receiptSeq: 0,
})

const uid = () => crypto.randomUUID()

const moveStock = (state, { variantId, quantity, type, ref, userId, unitCost, reason = null, note = null, at, allowNegative = false }) => {
  const balanceAfter = (state.stock[variantId] ?? 0) + quantity
  if (balanceAfter < 0 && !allowNegative) throw new Error("Not enough stock")
  return {
    ...state,
    stock: { ...state.stock, [variantId]: balanceAfter },
    movements: [
      ...state.movements,
      { id: uid(), shopId: SHOP_ID, variantId, type, quantity, balanceAfter, unitCost, reason, note, ref, userId, createdAt: at },
    ],
  }
}

export const openShiftFor = (state) => state.shifts.find(({ status, registerId }) => status === "open" && registerId === REGISTER_ID)

export const applySale = (state, { lines, payments, cashierId, shiftId, at, offline = false, approvedBy = null, settings = pricingDefaults }) => {
  if (!lines.length) throw new Error("Cart is empty")
  if (!shiftId) throw new Error("Open a shift before selling")

  const { productById, variantById } = indexCatalog(state)
  const items = lines.map(({ variantId, quantity, discount = 0, productDiscount = 0, entry = "scan" }) => {
    const variant = variantById[variantId]
    if (!variant) throw new Error("Unknown item")
    if (!variant.active || productById[variant.productId].status !== "active") throw new Error("This item is archived and cannot be sold")
    if (quantity < 1) throw new Error("Quantity must be at least 1")
    const gross = variant.price * quantity
    if (discount < 0 || discount > gross) throw new Error("Invalid discount")
    if (productDiscount < 0 || productDiscount > gross - discount) throw new Error("Invalid product discount")
    return {
      variantId,
      productName: productById[variant.productId].name,
      sku: variant.sku,
      attributes: variant.attributes,
      quantity,
      unitPrice: variant.price,
      unitCost: variant.cost,
      productDiscount,
      discount,
      tax: 0,
      total: gross - discount - productDiscount,
      entry,
    }
  })

  const subtotal = sumBy(items, ({ unitPrice, quantity }) => unitPrice * quantity)
  const cartDiscount = sumBy(items, ({ discount }) => discount)
  const discountTotal = cartDiscount + sumBy(items, ({ productDiscount }) => productDiscount)
  const taxRate = settings.taxEnabled ? Number(settings.taxRate) || 0 : 0
  const taxTotal = taxRate > 0 ? Math.round(((subtotal - discountTotal) * taxRate) / 100) : 0
  const total = subtotal - discountTotal + taxTotal
  const paid = sumBy(payments, ({ amount }) => amount)
  const cashPaid = sumBy(payments.filter(({ method }) => method === "cash"), ({ amount }) => amount)
  const change = paid - total

  if (change < 0) throw new Error("Payment is short")
  if (change > cashPaid) throw new Error("Change can only be given from cash")
  if (cartDiscount > subtotal * MAX_CASHIER_DISCOUNT && !approvedBy) throw new Error("Manager approval needed for this discount")

  const receiptSeq = state.receiptSeq + 1
  const sale = {
    id: uid(),
    clientId: uid(),
    number: `${REGISTER_CODE}-${String(receiptSeq).padStart(6, "0")}`,
    shopId: SHOP_ID,
    registerId: REGISTER_ID,
    shiftId,
    cashierId,
    items,
    subtotal,
    discountTotal,
    cartDiscount,
    taxRate,
    taxTotal,
    total,
    payments,
    change,
    manualDiscountBy: approvedBy,
    soldAt: at,
    syncedAt: offline ? null : at,
    offline,
    flags: [],
  }

  let next = { ...state, receiptSeq }
  for (const item of items) {
    next = moveStock(next, {
      variantId: item.variantId,
      quantity: -item.quantity,
      type: "sale",
      unitCost: item.unitCost,
      ref: { kind: "Sale", id: sale.id, number: sale.number },
      userId: cashierId,
      at,
      allowNegative: true,
    })
  }

  if (items.some(({ variantId }) => next.stock[variantId] < 0)) sale.flags.push("negative_stock")
  if (cartDiscount > subtotal * MAX_CASHIER_DISCOUNT) sale.flags.push("big_discount")

  return {
    state: {
      ...next,
      sales: [...next.sales, sale],
      outbox: offline ? [...next.outbox, sale.id] : next.outbox,
    },
    record: sale,
  }
}

export const refundableQuantity = (state, saleId, variantId) => {
  const sale = state.sales.find(({ id }) => id === saleId)
  const sold = sale?.items.find((item) => item.variantId === variantId)?.quantity ?? 0
  const claimed = sumBy(
    state.refunds.filter((refund) => refund.saleId === saleId && refund.status !== "rejected"),
    (refund) => sumBy(refund.items.filter((item) => item.variantId === variantId), ({ quantity }) => quantity)
  )
  return sold - claimed
}

export const applyRefundRequest = (state, { saleId, lines, reason, method, requestedBy, shiftId, at }) => {
  const sale = state.sales.find(({ id }) => id === saleId)
  if (!sale) throw new Error("Sale not found")
  if (!reason?.trim()) throw new Error("A reason is required")
  if (!lines.length) throw new Error("Pick at least one item")

  const items = lines.map(({ variantId, quantity, restock = true }) => {
    if (quantity < 1 || quantity > refundableQuantity(state, saleId, variantId)) throw new Error("Refund quantity is more than what was sold")
    const item = sale.items.find((saleItem) => saleItem.variantId === variantId)
    return { variantId, quantity, restock, amount: Math.round((item.total / item.quantity) * quantity) }
  })

  const refund = {
    id: uid(),
    clientId: uid(),
    saleId,
    saleNumber: sale.number,
    shopId: SHOP_ID,
    shiftId,
    requestedBy,
    items,
    total: sumBy(items, ({ amount }) => amount),
    method,
    reason: reason.trim(),
    status: "pending",
    decidedBy: null,
    decidedAt: null,
    createdAt: at,
  }

  return { state: { ...state, refunds: [...state.refunds, refund] }, record: refund }
}

export const applyRefundDecision = (state, { refundId, approve, userId, at }) => {
  const refund = state.refunds.find(({ id }) => id === refundId)
  if (!refund) throw new Error("Refund not found")
  if (refund.status !== "pending") throw new Error("Refund already decided")

  const decided = { ...refund, status: approve ? "approved" : "rejected", decidedBy: userId, decidedAt: at }
  let next = { ...state, refunds: state.refunds.map((item) => (item.id === refundId ? decided : item)) }

  if (approve) {
    const { variantById } = indexCatalog(state)
    for (const item of refund.items.filter(({ restock }) => restock)) {
      next = moveStock(next, {
        variantId: item.variantId,
        quantity: item.quantity,
        type: "return",
        unitCost: variantById[item.variantId].cost,
        ref: { kind: "Refund", id: refund.id, number: refund.saleNumber },
        userId,
        at,
      })
    }
  }

  return { state: next, record: decided }
}

export const applyOpenShift = (state, { cashierId, openingCash, at }) => {
  if (openShiftFor(state)) throw new Error("A shift is already open on this counter")
  if (openingCash < 0) throw new Error("Opening cash cannot be negative")

  const shift = {
    id: uid(),
    clientId: uid(),
    shopId: SHOP_ID,
    registerId: REGISTER_ID,
    cashierId,
    status: "open",
    openedAt: at,
    openingCash,
    cashEvents: [],
    closedAt: null,
    closedBy: null,
    countedCash: null,
    expectedCash: null,
    difference: null,
  }

  return { state: { ...state, shifts: [...state.shifts, shift] }, record: shift }
}

export const expectedCash = (state, shift) => {
  const cashSales = sumBy(
    state.sales.filter(({ shiftId }) => shiftId === shift.id),
    ({ payments, change }) => sumBy(payments.filter(({ method }) => method === "cash"), ({ amount }) => amount) - change
  )
  const cashRefunds = sumBy(
    state.refunds.filter(({ shiftId, status, method }) => shiftId === shift.id && status === "approved" && method === "cash"),
    ({ total }) => total
  )
  const events = sumBy(shift.cashEvents, ({ type, amount }) => (type === "in" ? amount : -amount))
  return shift.openingCash + cashSales - cashRefunds + events
}

export const shiftSummary = (state, shift) => {
  const sales = state.sales.filter(({ shiftId }) => shiftId === shift.id)
  const paidBy = (method) =>
    sumBy(sales, ({ payments, change }) =>
      sumBy(payments.filter((payment) => payment.method === method), ({ amount }) => amount) - (method === "cash" ? change : 0)
    )
  const refunds = state.refunds.filter(({ shiftId, status }) => shiftId === shift.id && status === "approved")

  return {
    saleCount: sales.length,
    itemCount: sumBy(sales, ({ items }) => sumBy(items, ({ quantity }) => quantity)),
    revenue: sumBy(sales, ({ total }) => total),
    discounts: sumBy(sales, ({ discountTotal }) => discountTotal),
    cashSales: paidBy("cash"),
    cardSales: paidBy("card"),
    cashRefunds: sumBy(refunds.filter(({ method }) => method === "cash"), ({ total }) => total),
    openingCash: shift.openingCash,
    expectedCash: expectedCash(state, shift),
  }
}

export const applyCloseShift = (state, { shiftId, countedCash, closedBy, note = null, at }) => {
  const shift = state.shifts.find(({ id }) => id === shiftId)
  if (!shift || shift.status !== "open") throw new Error("Shift is not open")
  if (countedCash < 0) throw new Error("Counted cash cannot be negative")

  const expected = expectedCash(state, shift)
  const closed = { ...shift, status: "closed", closedAt: at, closedBy, countedCash, expectedCash: expected, difference: countedCash - expected, closeNote: note?.trim() || null }

  return { state: { ...state, shifts: state.shifts.map((item) => (item.id === shiftId ? closed : item)) }, record: closed }
}

export const applyPurchase = (state, { lines, supplier, receivedBy, at }) => {
  if (!lines.length) throw new Error("Add at least one item")
  const purchase = {
    id: uid(),
    shopId: SHOP_ID,
    supplier,
    items: lines,
    total: sumBy(lines, ({ quantity, unitCost }) => quantity * unitCost),
    receivedBy,
    receivedAt: at,
  }

  let next = { ...state, purchases: [...state.purchases, purchase] }
  for (const { variantId, quantity, unitCost } of lines) {
    if (quantity < 1) throw new Error("Quantity must be at least 1")
    next = moveStock(next, { variantId, quantity, type: "purchase", unitCost, ref: { kind: "Purchase", id: purchase.id, number: supplier }, userId: receivedBy, at })
  }

  return { state: next, record: purchase }
}

export const applyAdjustment = (state, { variantId, quantity, reason, note, userId, at }) => {
  if (!reason) throw new Error("A reason is required")
  if (!quantity) throw new Error("Quantity cannot be zero")
  const { variantById } = indexCatalog(state)
  const next = moveStock(state, { variantId, quantity, type: "adjustment", unitCost: variantById[variantId].cost, reason, note, ref: null, userId, at })
  return { state: next, record: next.movements.at(-1) }
}

export const applySync = (state, { at }) => ({
  state: {
    ...state,
    outbox: [],
    sales: state.sales.map((sale) => (state.outbox.includes(sale.id) ? { ...sale, syncedAt: at } : sale)),
  },
  record: state.outbox.length,
})
