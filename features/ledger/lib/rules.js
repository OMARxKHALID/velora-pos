import { REGISTER_CODE, REGISTER_ID, SHOP_ID, indexCatalog } from "@/features/catalog/lib/catalog"
import { effectiveRate, lineDiscount, netRevenue, taxFor } from "@/features/pricing/lib/pricing"
import { newId } from "@/lib/id"
import { roundToRupee, sumBy } from "@/lib/money"

export const MAX_CASHIER_DISCOUNT = 0.05
export const PAYMENT_METHODS = ["cash", "card", "jazzcash", "easypaisa", "bank"]

export const REFERENCE_REQUIRED = ["jazzcash", "easypaisa", "bank"]

const pricingDefaults = { taxEnabled: false, taxRate: 0, productDiscountEnabled: true, cartDiscountEnabled: true }

const isMoney = (amount) => Number.isInteger(amount) && amount >= 0

const variantOrThrow = (state, variantId) => {
  const variant = indexCatalog(state).variantById[variantId]
  if (!variant) throw new Error("Unknown item")
  return variant
}

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
  receiptSeq: 0,
})

const moveStock = (
  state,
  { variantId, quantity, type, ref, userId, unitCost, reason = null, note = null, at, allowNegative = false, shopId = SHOP_ID }
) => {
  const balanceAfter = (state.stock[variantId] ?? 0) + quantity
  if (balanceAfter < 0 && !allowNegative) throw new Error("Not enough stock")
  return {
    ...state,
    stock: { ...state.stock, [variantId]: balanceAfter },
    movements: [
      ...state.movements,
      { id: newId(), shopId, variantId, type, quantity, balanceAfter, unitCost, reason, note, ref, userId, createdAt: at },
    ],
  }
}

export const openShiftFor = (state, registerId = REGISTER_ID) =>
  state.shifts.find((shift) => shift.status === "open" && shift.registerId === registerId)

export const applySale = (
  state,
  {
    lines,
    payments,
    cashierId,
    shiftId,
    at,
    clientId = newId(),
    offline = false,
    approvedBy = null,
    settings = pricingDefaults,
    customerName,
    customerPhone,
    shopId = SHOP_ID,
    registerId = REGISTER_ID,
    registerCode = REGISTER_CODE,
  }
) => {
  const existing = state.sales.find((sale) => sale.clientId === clientId)
  if (existing) return { state, record: existing }

  if (!lines.length) throw new Error("Cart is empty")
  const shift = state.shifts.find(({ id }) => id === shiftId)
  if (!shift || shift.status !== "open") throw new Error("Open a shift before selling")
  if (shift.registerId !== registerId) throw new Error("This shift belongs to another counter")
  if (shift.cashierId !== cashierId) throw new Error("This shift belongs to another cashier")
  if (!payments?.length) throw new Error("Add a payment")
  if (payments.some(({ method, amount }) => !PAYMENT_METHODS.includes(method) || !Number.isInteger(amount) || amount <= 0)) {
    throw new Error("Invalid payment")
  }
  if (payments.some(({ method, reference }) => REFERENCE_REQUIRED.includes(method) && !reference?.trim())) {
    throw new Error("Enter the transaction ID for wallet and bank payments")
  }

  const { productById, variantById } = indexCatalog(state)
  const items = lines.map(({ variantId, quantity, discount = 0, productDiscount = 0, entry = "scan" }) => {
    const variant = variantById[variantId]
    if (!variant) throw new Error("Unknown item")
    if (!variant.active || productById[variant.productId].status !== "active") throw new Error("This item is archived and cannot be sold")
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantity must be at least 1")
    const gross = variant.price * quantity
    if (discount < 0 || discount > gross) throw new Error("Invalid discount")
    if (discount && !settings.cartDiscountEnabled) throw new Error("Cart discounts are turned off")
    const listedDiscount = settings.productDiscountEnabled ? lineDiscount(gross, productById[variant.productId].discountPct ?? 0) : 0
    if (productDiscount !== listedDiscount || productDiscount > gross - discount) throw new Error("Invalid product discount")
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
      total: gross - discount - productDiscount,
      entry,
    }
  })

  const subtotal = sumBy(items, ({ unitPrice, quantity }) => unitPrice * quantity)
  const cartDiscount = sumBy(items, ({ discount }) => discount)
  const discountTotal = cartDiscount + sumBy(items, ({ productDiscount }) => productDiscount)
  const taxRate = effectiveRate(settings)
  const taxLabel = settings.taxLabel || "Tax"
  const taxTotal = taxFor(subtotal - discountTotal, taxRate)
  const total = subtotal - discountTotal + taxTotal
  const paid = sumBy(payments, ({ amount }) => amount)
  const cashPaid = sumBy(payments.filter(({ method }) => method === "cash"), ({ amount }) => amount)
  const change = paid - total

  if (change < 0) throw new Error("Payment is short")
  if (change > cashPaid) throw new Error("Change can only be given from cash")
  if (cartDiscount > subtotal * MAX_CASHIER_DISCOUNT && !approvedBy) throw new Error("Supervisor approval needed for this discount")

  const receiptSeq = state.receiptSeq + 1
  const cleanCustomerName = customerName?.trim()
  const cleanCustomerPhone = customerPhone?.trim()

  const sale = {
    id: newId(),
    clientId,
    number: `${registerCode}-${String(receiptSeq).padStart(6, "0")}`,
    shopId,
    registerId,
    shiftId,
    cashierId,
    items,
    subtotal,
    discountTotal,
    cartDiscount,
    taxRate,
    taxLabel: taxTotal > 0 ? taxLabel : null,
    taxTotal,
    total,
    payments,
    change,
    manualDiscountBy: approvedBy,
    soldAt: at,
    syncedAt: offline ? null : at,
    offline,
    flags: [],
    ...(cleanCustomerName ? { customerName: cleanCustomerName } : null),
    ...(cleanCustomerPhone ? { customerPhone: cleanCustomerPhone } : null),
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
      shopId,
    })
  }

  if (items.some(({ variantId }) => next.stock[variantId] < 0)) sale.flags.push("negative_stock")
  if (cartDiscount > subtotal * MAX_CASHIER_DISCOUNT) sale.flags.push("big_discount")

  return {
    state: {
      ...next,
      sales: [...next.sales, sale],
    },
    record: sale,
  }
}

const liveRefunds = (state, saleId) => state.refunds.filter((refund) => refund.saleId === saleId && refund.status !== "rejected")

export const refundableQuantity = (state, saleId, variantId) => {
  const sale = state.sales.find(({ id }) => id === saleId)
  const sold = sale?.items.find((item) => item.variantId === variantId)?.quantity ?? 0
  const claimed = sumBy(liveRefunds(state, saleId), (refund) =>
    sumBy(refund.items.filter((item) => item.variantId === variantId), ({ quantity }) => quantity)
  )
  return sold - claimed
}

const paidByMethod = (sale) =>
  Object.fromEntries(
    PAYMENT_METHODS.map((method) => [
      method,
      sumBy(sale.payments.filter((payment) => payment.method === method), ({ amount }) => amount) - (method === "cash" ? sale.change : 0),
    ])
  )

export const refundMethodsFor = (sale) => {
  const paid = paidByMethod(sale)
  return PAYMENT_METHODS.filter((method) => paid[method] > 0)
}

export const refundCapFor = (state, sale, method) =>
  paidByMethod(sale)[method] - sumBy(liveRefunds(state, sale.id).filter((refund) => refund.method === method), ({ total }) => total)

export const previewRefund = (state, saleId, lines) => {
  const sale = state.sales.find(({ id }) => id === saleId)
  if (!sale) throw new Error("Sale not found")

  const prior = liveRefunds(state, saleId)
  const items = lines
    .filter(({ quantity }) => quantity !== 0)
    .map(({ variantId, quantity, restock = true }) => {
      const item = sale.items.find((saleItem) => saleItem.variantId === variantId)
      if (!item) throw new Error("Item is not on this sale")
      const remaining = refundableQuantity(state, saleId, variantId)
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > remaining) throw new Error("You cannot return more than was sold")
      const alreadyRefunded = sumBy(
        prior.flatMap((refund) => refund.items.filter((entry) => entry.variantId === variantId)),
        ({ amount }) => amount
      )
      const left = item.total - alreadyRefunded
      const amount = quantity === remaining ? left : Math.min(roundToRupee((item.total / item.quantity) * quantity), left)
      return { variantId, quantity, restock, amount }
    })

  const amount = sumBy(items, (entry) => entry.amount)
  const netSale = sale.subtotal - sale.discountTotal
  const taxLeft = (sale.taxTotal ?? 0) - sumBy(prior, (refund) => refund.taxTotal ?? 0)
  const completesSale = sale.items.every(
    (item) => refundableQuantity(state, saleId, item.variantId) === (items.find((entry) => entry.variantId === item.variantId)?.quantity ?? 0)
  )
  const taxTotal =
    (sale.taxTotal ?? 0) > 0 && netSale > 0 && items.length
      ? completesSale
        ? taxLeft
        : Math.min(taxLeft, roundToRupee((sale.taxTotal * amount) / netSale))
      : 0

  return { sale, items, amount, taxTotal, total: amount + taxTotal }
}

export const applyRefundRequest = (state, { saleId, lines, reason, method, requestedBy, shiftId, at, clientId = newId() }) => {
  const existing = state.refunds.find((refund) => refund.clientId === clientId)
  if (existing) return { state, record: existing }

  const sale = state.sales.find(({ id }) => id === saleId)
  if (!sale) throw new Error("Sale not found")
  if (!reason?.trim()) throw new Error("A reason is required")
  if (!lines.length) throw new Error("Pick at least one item")

  const { items, taxTotal, total } = previewRefund(state, saleId, lines)
  if (!items.length) throw new Error("Pick at least one item")
  if (!refundMethodsFor(sale).includes(method)) throw new Error(`This sale was not paid by ${method}`)
  if (total > refundCapFor(state, sale, method)) throw new Error(`That is more than was paid by ${method}. Refund the rest through the other method.`)

  const refund = {
    id: newId(),
    clientId,
    saleId,
    saleNumber: sale.number,
    shopId: sale.shopId,
    shiftId,
    requestedBy,
    items,
    taxTotal,
    total,
    method,
    reason: reason.trim(),
    status: "pending",
    decidedBy: null,
    decidedAt: null,
    payoutShiftId: null,
    createdAt: at,
    syncedAt: at,
  }

  return { state: { ...state, refunds: [...state.refunds, refund] }, record: refund }
}

export const applyRefundDecision = (state, { refundId, approve, userId, at }) => {
  const refund = state.refunds.find(({ id }) => id === refundId)
  if (!refund) throw new Error("Return not found")
  if (refund.status !== "pending") throw new Error("This return was already decided")

  const sale = state.sales.find(({ id }) => id === refund.saleId)
  const openShiftId = approve ? (openShiftFor(state, sale?.registerId)?.id ?? null) : null
  const payoutShiftId = refund.method === "cash" ? openShiftId : null
  if (approve && refund.method === "cash" && !payoutShiftId) throw new Error("Open a counter shift first. Cash refunds are paid from the drawer.")
  const decided = {
    ...refund,
    status: approve ? "approved" : "rejected",
    decidedBy: userId,
    decidedAt: at,
    payoutShiftId,
    approvedInShiftId: openShiftId,
    syncedAt: at,
  }
  let next = { ...state, refunds: state.refunds.map((item) => (item.id === refundId ? decided : item)) }

  if (approve) {
    for (const item of refund.items.filter(({ restock }) => restock)) {
      const soldAt = sale?.items.find(({ variantId }) => variantId === item.variantId)?.unitCost
      next = moveStock(next, {
        variantId: item.variantId,
        quantity: item.quantity,
        type: "return",
        unitCost: soldAt ?? variantOrThrow(state, item.variantId).cost,
        ref: { kind: "Refund", id: refund.id, number: refund.saleNumber },
        userId,
        at,
        shopId: refund.shopId,
      })
    }
  }

  return { state: next, record: decided }
}

export const applyOpenShift = (state, { cashierId, openingCash, at, clientId = newId(), shopId = SHOP_ID, registerId = REGISTER_ID, registerCode = REGISTER_CODE }) => {
  const existing = state.shifts.find((shift) => shift.clientId === clientId)
  if (existing) return { state, record: existing }
  if (openShiftFor(state, registerId)) throw new Error("A shift is already open on this counter")
  if (!isMoney(openingCash)) throw new Error("Opening cash must be a whole amount, not negative")

  const shift = {
    id: newId(),
    clientId,
    shopId,
    registerId,
    registerCode,
    cashierId,
    status: "open",
    openedAt: at,
    openingCash,
    closedAt: null,
    closedBy: null,
    countedCash: null,
    expectedCash: null,
    difference: null,
    syncedAt: at,
  }

  return { state: { ...state, shifts: [...state.shifts, shift] }, record: shift }
}

const cashSalesFor = (state, shift) =>
  sumBy(
    state.sales.filter(({ shiftId }) => shiftId === shift.id),
    ({ payments, change }) => sumBy(payments.filter(({ method }) => method === "cash"), ({ amount }) => amount) - change
  )

const cashRefundsFor = (state, shift) => sumBy(state.refunds.filter(({ payoutShiftId }) => payoutShiftId === shift.id), ({ total }) => total)

const approvedRefundsFor = (state, shift, method) =>
  sumBy(
    state.refunds.filter((refund) => refund.approvedInShiftId === shift.id && refund.status === "approved" && refund.method === method),
    ({ total }) => total
  )

export const expectedCash = (state, shift) => shift.openingCash + cashSalesFor(state, shift) - cashRefundsFor(state, shift)

const liveSummary = (state, shift) => {
  const sales = state.sales.filter(({ shiftId }) => shiftId === shift.id)
  const paidBy = (method) =>
    sumBy(sales, ({ payments }) => sumBy(payments.filter((payment) => payment.method === method), ({ amount }) => amount))

  return {
    saleCount: sales.length,
    itemCount: sumBy(sales, ({ items }) => sumBy(items, ({ quantity }) => quantity)),
    gross: sumBy(sales, ({ subtotal }) => subtotal),
    discounts: sumBy(sales, ({ discountTotal }) => discountTotal),
    netSales: sumBy(sales, netRevenue),
    tax: sumBy(sales, ({ taxTotal }) => taxTotal ?? 0),
    revenue: sumBy(sales, ({ total }) => total),
    cashSales: cashSalesFor(state, shift),
    cardSales: paidBy("card"),
    otherSales: Object.fromEntries(REFERENCE_REQUIRED.map((method) => [method, paidBy(method)])),
    otherRefunds: Object.fromEntries(REFERENCE_REQUIRED.map((method) => [method, approvedRefundsFor(state, shift, method)])),
    cashRefunds: cashRefundsFor(state, shift),
    cardRefunds: approvedRefundsFor(state, shift, "card"),
    openingCash: shift.openingCash,
    expectedCash: expectedCash(state, shift),
  }
}

export const shiftSummary = (state, shift) => (shift.status === "closed" && shift.summary ? shift.summary : liveSummary(state, shift))

export const applyCloseShift = (state, { shiftId, countedCash, closedBy, note = null, at }) => {
  const shift = state.shifts.find(({ id }) => id === shiftId)
  if (!shift || shift.status !== "open") throw new Error("Shift is not open")
  if (!isMoney(countedCash)) throw new Error("Counted cash must be a whole amount, not negative")

  const summary = liveSummary(state, shift)
  const expected = summary.expectedCash
  const closed = {
    ...shift,
    status: "closed",
    closedAt: at,
    closedBy,
    countedCash,
    expectedCash: expected,
    difference: countedCash - expected,
    closeNote: note?.trim() || null,
    summary,
    syncedAt: at,
  }

  return {
    state: { ...state, shifts: state.shifts.map((item) => (item.id === shiftId ? closed : item)) },
    record: closed,
  }
}

export const applyPurchase = (state, { lines, supplier, receivedBy, at, shopId = SHOP_ID }) => {
  if (!lines.length) throw new Error("Add at least one item")
  for (const { variantId, quantity, unitCost } of lines) {
    variantOrThrow(state, variantId)
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantity must be at least 1")
    if (!isMoney(unitCost)) throw new Error("Cost must be a whole amount, not negative")
  }
  const purchase = {
    id: newId(),
    shopId,
    supplier,
    items: lines,
    total: sumBy(lines, ({ quantity, unitCost }) => quantity * unitCost),
    receivedBy,
    receivedAt: at,
    syncedAt: at,
  }

  let next = { ...state, purchases: [...state.purchases, purchase] }
  for (const { variantId, quantity, unitCost } of lines) {
    next = moveStock(next, { variantId, quantity, type: "purchase", unitCost, ref: { kind: "Purchase", id: purchase.id, number: supplier }, userId: receivedBy, at, shopId })
  }

  return { state: next, record: purchase }
}

export const applyAdjustment = (state, { variantId, quantity, reason, note, userId, at, shopId = SHOP_ID }) => {
  if (!reason) throw new Error("A reason is required")
  if (!Number.isInteger(quantity) || !quantity) throw new Error("Quantity must be a whole number and not zero")
  const variant = variantOrThrow(state, variantId)
  const moved = moveStock(state, { variantId, quantity, type: "adjustment", unitCost: variant.cost, reason, note, ref: null, userId, at, shopId })
  const movement = { ...moved.movements.at(-1), syncedAt: at }
  const next = { ...moved, movements: [...moved.movements.slice(0, -1), movement] }
  return { state: next, record: movement }
}

