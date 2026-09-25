import { describe, expect, test } from "bun:test"
import { seedCatalog } from "@/features/catalog/lib/catalog"
import { indexCatalog } from "@/features/catalog/lib/catalog"
import {
  applyAdjustment,
  applyCloseShift,
  applyOpenShift,
  applyPurchase,
  applyRefundDecision,
  applyRefundRequest,
  applySale,
  applySync,
  emptyLedger,
  openShiftFor,
  previewRefund,
  refundCapFor,
  refundMethodsFor,
  shiftSummary,
} from "./ledger"

const catalog = seedCatalog()
const shoe = catalog.variants[0]
const at = Date.now()

const stocked = () =>
  applyPurchase({ ...emptyLedger(), ...catalog }, { lines: [{ variantId: shoe.id, quantity: 5, unitCost: shoe.cost }], supplier: "Test", receivedBy: "u-manager", at }).state

const withShift = () => applyOpenShift(stocked(), { cashierId: "u-cashier", openingCash: 1000000, at })

describe("ledger", () => {
  test("sale lowers stock and writes a sale movement", () => {
    const { state: opened, record: shift } = withShift()
    const { state, record: sale } = applySale(opened, {
      lines: [{ variantId: shoe.id, quantity: 2 }],
      payments: [{ method: "cash", amount: shoe.price * 2 }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
    })
    expect(state.stock[shoe.id]).toBe(3)
    expect(state.movements.at(-1)).toMatchObject({ type: "sale", quantity: -2, balanceAfter: 3 })
    expect(sale.items[0].unitCost).toBe(shoe.cost)
  })

  test("discount above 5% needs a manager", () => {
    const { state, record: shift } = withShift()
    const input = {
      lines: [{ variantId: shoe.id, quantity: 1, discount: shoe.price * 0.1 }],
      payments: [{ method: "card", amount: shoe.price * 0.9 }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
    }
    expect(() => applySale(state, input)).toThrow("Supervisor approval")
    expect(applySale(state, { ...input, approvedBy: "u-manager" }).record.flags).toContain("big_discount")
  })

  test("discounts must follow the price list and the discount settings", () => {
    const { state, record: shift } = withShift()
    const input = { payments: [{ method: "card", amount: shoe.price }], cashierId: "u-cashier", shiftId: shift.id, at }
    const settings = { taxEnabled: false, taxRate: 0, productDiscountEnabled: true, cartDiscountEnabled: false }
    expect(() => applySale(state, { ...input, lines: [{ variantId: shoe.id, quantity: 1, productDiscount: 10000 }] })).toThrow("Invalid product discount")
    expect(() => applySale(state, { ...input, settings, lines: [{ variantId: shoe.id, quantity: 1, discount: 10000 }] })).toThrow("Cart discounts are turned off")
  })

  test("refund cannot exceed sold quantity and restocks only on approval", () => {
    const { state: opened, record: shift } = withShift()
    const { state: sold, record: sale } = applySale(opened, {
      lines: [{ variantId: shoe.id, quantity: 1 }],
      payments: [{ method: "cash", amount: shoe.price }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
    })
    const request = { saleId: sale.id, lines: [{ variantId: shoe.id, quantity: 1 }], reason: "Wrong size", method: "cash", requestedBy: "u-cashier", shiftId: shift.id, at }
    const { state: requested, record: refund } = applyRefundRequest(sold, request)
    expect(requested.stock[shoe.id]).toBe(4)
    expect(() => applyRefundRequest(requested, request)).toThrow("more than what was sold")
    const { state: approved } = applyRefundDecision(requested, { refundId: refund.id, approve: true, userId: "u-manager", at })
    expect(approved.stock[shoe.id]).toBe(5)
    expect(() => applyRefundDecision(approved, { refundId: refund.id, approve: true, userId: "u-manager", at })).toThrow("already decided")
  })

  test("closing a shift reports the cash difference", () => {
    const { state: opened, record: shift } = withShift()
    const { state: sold } = applySale(opened, {
      lines: [{ variantId: shoe.id, quantity: 1 }],
      payments: [{ method: "cash", amount: shoe.price + 100000 }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
    })
    const { record: closed } = applyCloseShift(sold, { shiftId: shift.id, countedCash: 1000000 + shoe.price - 50000, closedBy: "u-cashier", at })
    expect(closed.expectedCash).toBe(1000000 + shoe.price)
    expect(closed.difference).toBe(-50000)
  })

  test("offline sales queue once and sync once", () => {
    const { state: opened, record: shift } = withShift()
    const input = { lines: [{ variantId: shoe.id, quantity: 1 }], payments: [{ method: "card", amount: shoe.price }], cashierId: "u-cashier", shiftId: shift.id, at, offline: true }
    const { state: sold, record: sale } = applySale(opened, input)
    expect(sold.outbox).toEqual([sale.id])
    expect(sale.syncedAt).toBeNull()
    const { state: synced, record: count } = applySync(sold, { at })
    expect(count).toBe(1)
    expect(synced.outbox).toEqual([])
    expect(synced.sales.at(-1).syncedAt).toBe(at)
    expect(applySync(synced, { at }).record).toBe(0)
  })

  test("sale records customer details and custom tax label", () => {
    const { state: opened, record: shift } = withShift()
    const { record: sale } = applySale(opened, {
      lines: [{ variantId: shoe.id, quantity: 1 }],
      payments: [{ method: "cash", amount: Math.round(shoe.price * 1.05) }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
      customerName: "  Tariq Mehmood  ",
      customerPhone: "  0300 1234567  ",
      settings: { taxEnabled: true, taxLabel: "GST", taxRate: 5 },
    })
    expect(sale.customerName).toBe("Tariq Mehmood")
    expect(sale.customerPhone).toBe("0300 1234567")
    expect(sale.taxLabel).toBe("GST")
    expect(sale.taxRate).toBe(5)
  })

  test("empty customer details are omitted from sale record", () => {
    const { state: opened, record: shift } = withShift()
    const { record: sale } = applySale(opened, {
      lines: [{ variantId: shoe.id, quantity: 1 }],
      payments: [{ method: "cash", amount: shoe.price }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
      customerName: "   ",
      customerPhone: "",
    })
    expect(sale.customerName).toBeUndefined()
    expect(sale.customerPhone).toBeUndefined()
  })

  test("multiple offline sales with split payments queue and sync accurately", () => {
    const { state: opened, record: shift } = withShift()
    const cashPortion = Math.floor(shoe.price / 2)
    const cardPortion = shoe.price - cashPortion

    const { state: s1, record: saleOnline } = applySale(opened, {
      lines: [{ variantId: shoe.id, quantity: 1 }],
      payments: [{ method: "cash", amount: shoe.price }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
      offline: false,
    })
    expect(s1.outbox).toEqual([])
    expect(saleOnline.syncedAt).toBe(at)

    const { state: s2, record: saleOff1 } = applySale(s1, {
      lines: [{ variantId: shoe.id, quantity: 1 }],
      payments: [
        { method: "cash", amount: cashPortion },
        { method: "card", amount: cardPortion },
      ],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at: at + 1000,
      offline: true,
    })
    expect(s2.outbox).toEqual([saleOff1.id])
    expect(saleOff1.syncedAt).toBeNull()

    const { state: s3, record: saleOff2 } = applySale(s2, {
      lines: [{ variantId: shoe.id, quantity: 1 }],
      payments: [{ method: "card", amount: shoe.price }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at: at + 2000,
      offline: true,
    })
    expect(s3.outbox).toEqual([saleOff1.id, saleOff2.id])
    expect(saleOff2.syncedAt).toBeNull()

    const summary = shiftSummary(s3, shift)
    expect(summary.saleCount).toBe(3)
    expect(summary.revenue).toBe(shoe.price * 3)
    expect(summary.cashSales).toBe(shoe.price + cashPortion)
    expect(summary.cardSales).toBe(cardPortion + shoe.price)

    const syncTime = at + 5000
    const { state: synced, record: count } = applySync(s3, { at: syncTime })
    expect(count).toBe(2)
    expect(synced.outbox).toEqual([])

    const syncedSales = synced.sales
    expect(syncedSales.find((s) => s.id === saleOnline.id).syncedAt).toBe(at)
    expect(syncedSales.find((s) => s.id === saleOff1.id).syncedAt).toBe(syncTime)
    expect(syncedSales.find((s) => s.id === saleOff2.id).syncedAt).toBe(syncTime)
  })

  test("the same checkout submitted twice sells only once", () => {
    const { state: opened, record: shift } = withShift()
    const input = { lines: [{ variantId: shoe.id, quantity: 1 }], payments: [{ method: "cash", amount: shoe.price }], cashierId: "u-cashier", shiftId: shift.id, at, clientId: "checkout-1" }
    const first = applySale(opened, input)
    const second = applySale(first.state, input)
    expect(second.record.id).toBe(first.record.id)
    expect(second.state.sales).toHaveLength(1)
    expect(second.state.stock[shoe.id]).toBe(4)
    expect(second.state.receiptSeq).toBe(1)
  })

  test("payments must be positive whole-paisa amounts by a known method", () => {
    const { state, record: shift } = withShift()
    const base = { lines: [{ variantId: shoe.id, quantity: 1 }], cashierId: "u-cashier", shiftId: shift.id, at }
    expect(() => applySale(state, { ...base, payments: [] })).toThrow("Add a payment")
    expect(() => applySale(state, { ...base, payments: [{ method: "cheque", amount: shoe.price }] })).toThrow("Invalid payment")
    expect(() => applySale(state, { ...base, payments: [{ method: "cash", amount: -5 }, { method: "card", amount: shoe.price + 5 }] })).toThrow("Invalid payment")
    expect(() => applySale(state, { ...base, lines: [{ variantId: shoe.id, quantity: 1.5 }], payments: [{ method: "cash", amount: shoe.price }] })).toThrow("Quantity")
  })

  test("a counter can only have one open shift, per register", () => {
    const { state, record } = withShift()
    expect(openShiftFor(state).id).toBe(record.id)
    expect(openShiftFor(state, "reg-other")).toBeUndefined()
    expect(() => applyOpenShift(state, { cashierId: "u-x", openingCash: 0, at })).toThrow("already open")
    expect(applyOpenShift(state, { cashierId: "u-x", openingCash: 0, at, registerId: "reg-other" }).record.registerId).toBe("reg-other")
  })
})

describe("refunds with tax", () => {
  const settings = { taxEnabled: true, taxLabel: "GST", taxRate: 15 }
  const sandal = catalog.variants.find(({ price }) => price === 499900)
  const stockedSandals = () =>
    applyPurchase({ ...emptyLedger(), ...catalog }, { lines: [{ variantId: sandal.id, quantity: 5, unitCost: sandal.cost }], supplier: "Test", receivedBy: "u-manager", at }).state

  const sell = (quantity) => {
    const { state: opened, record: shift } = applyOpenShift(stockedSandals(), { cashierId: "u-cashier", openingCash: 0, at })
    const { state, record: sale } = applySale(opened, {
      lines: [{ variantId: sandal.id, quantity }],
      payments: [{ method: "cash", amount: sandal.price * quantity * 2 }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
      settings,
    })
    return { state, sale, shift }
  }
  const request = (state, sale, shift, quantity, method = "cash") => ({
    saleId: sale.id,
    lines: [{ variantId: sandal.id, quantity, restock: true }],
    reason: "Wrong size",
    method,
    requestedBy: "u-cashier",
    shiftId: shift.id,
    at,
  })

  test("the customer gets the tax back with the goods", () => {
    const { state, sale, shift } = sell(1)
    expect(sale.taxTotal).toBe(75000)
    expect(sale.taxTotal % 100).toBe(0)
    const { record: refund } = applyRefundRequest(state, request(state, sale, shift, 1))
    expect(refund.total).toBe(sale.total)
    expect(refund.taxTotal).toBe(sale.taxTotal)
  })

  test("partial refunds share the tax and add up exactly to what was collected", () => {
    const { state, sale, shift } = sell(2)
    const first = applyRefundRequest(state, request(state, sale, shift, 1))
    const second = applyRefundRequest(first.state, request(first.state, sale, shift, 1))
    expect(first.record.total).toBe(sandal.price + sale.taxTotal / 2)
    expect(first.record.total + second.record.total).toBe(sale.total)
    expect(first.record.taxTotal + second.record.taxTotal).toBe(sale.taxTotal)
  })

  test("previewRefund quotes exactly what the ledger books", () => {
    const { state, sale, shift } = sell(2)
    const lines = [{ variantId: sandal.id, quantity: 1, restock: true }]
    const quote = previewRefund(state, sale.id, lines)
    expect(applyRefundRequest(state, request(state, sale, shift, 1)).record.total).toBe(quote.total)
    expect(previewRefund(state, sale.id, [{ variantId: sandal.id, quantity: 0 }]).total).toBe(0)
  })

  test("money goes back the way it came in", () => {
    const { state: opened, record: shift } = applyOpenShift(stockedSandals(), { cashierId: "u-cashier", openingCash: 0, at })
    const { state, record: cardSale } = applySale(opened, {
      lines: [{ variantId: sandal.id, quantity: 1 }],
      payments: [{ method: "card", amount: sandal.price }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
    })
    expect(refundMethodsFor(cardSale)).toEqual(["card"])
    expect(() => applyRefundRequest(state, request(state, cardSale, shift, 1, "cash"))).toThrow("not paid by cash")
    expect(refundCapFor(state, cardSale, "card")).toBe(sandal.price)
  })

  test("a split sale can be refunded through each method up to what it paid", () => {
    const { state: opened, record: shift } = applyOpenShift(stockedSandals(), { cashierId: "u-cashier", openingCash: 0, at })
    const { state, record: sale } = applySale(opened, {
      lines: [{ variantId: sandal.id, quantity: 2 }],
      payments: [{ method: "cash", amount: sandal.price }, { method: "card", amount: sandal.price }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
    })
    expect(refundMethodsFor(sale)).toEqual(["cash", "card"])
    const cashRefund = applyRefundRequest(state, request(state, sale, shift, 1, "cash"))
    expect(() => applyRefundRequest(cashRefund.state, request(cashRefund.state, sale, shift, 1, "cash"))).toThrow("more than was paid by cash")
    expect(applyRefundRequest(cashRefund.state, request(cashRefund.state, sale, shift, 1, "card")).record.method).toBe("card")
  })
})

describe("drawer accounting for cash refunds", () => {
  const sellForCash = () => {
    const { state: opened, record: shift } = withShift()
    const { state, record: sale } = applySale(opened, {
      lines: [{ variantId: shoe.id, quantity: 2 }],
      payments: [{ method: "cash", amount: shoe.price * 2 }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
    })
    const { state: requested, record: refund } = applyRefundRequest(state, {
      saleId: sale.id,
      lines: [{ variantId: shoe.id, quantity: 1, restock: true }],
      reason: "Wrong size",
      method: "cash",
      requestedBy: "u-cashier",
      shiftId: shift.id,
      at,
    })
    return { state: requested, shift, refund }
  }

  test("a cash refund cannot be approved while no drawer is open, and the closed shift's report stays put", () => {
    const { state, shift, refund } = sellForCash()
    const { state: closedState, record: closed } = applyCloseShift(state, { shiftId: shift.id, countedCash: 1000000 + shoe.price * 2, closedBy: "u-cashier", at })

    expect(() => applyRefundDecision(closedState, { refundId: refund.id, approve: true, userId: "u-manager", at: at + 5000 })).toThrow("Open a counter shift first")
    expect(applyRefundDecision(closedState, { refundId: refund.id, approve: false, userId: "u-manager", at: at + 5000 }).record.status).toBe("rejected")
    expect(shiftSummary(closedState, closed).expectedCash).toBe(closed.expectedCash)
  })

  test("the drawer that pays a refund out is the one that loses the cash", () => {
    const { state, shift, refund } = sellForCash()
    const { state: closedState } = applyCloseShift(state, { shiftId: shift.id, countedCash: 1000000 + shoe.price * 2, closedBy: "u-cashier", at })
    const { state: nextOpen, record: nextShift } = applyOpenShift(closedState, { cashierId: "u-cashier", openingCash: 500000, at: at + 1000 })
    const { state: approved, record: decided } = applyRefundDecision(nextOpen, { refundId: refund.id, approve: true, userId: "u-manager", at: at + 2000 })

    expect(decided.payoutShiftId).toBe(nextShift.id)
    expect(shiftSummary(approved, nextShift).cashRefunds).toBe(shoe.price)
    expect(shiftSummary(approved, nextShift).expectedCash).toBe(500000 - shoe.price)
  })

  test("a rejected or card refund never touches a drawer", () => {
    const { state, refund } = sellForCash()
    expect(applyRefundDecision(state, { refundId: refund.id, approve: false, userId: "u-manager", at }).record.payoutShiftId).toBeNull()
  })
})

describe("stock adjustments", () => {
  test("an adjustment cannot take stock below zero", () => {
    const state = stocked()
    expect(() => applyAdjustment(state, { variantId: shoe.id, quantity: -6, reason: "damaged", userId: "u-manager", at })).toThrow("Not enough stock")
    expect(applyAdjustment(state, { variantId: shoe.id, quantity: -2, reason: "damaged", userId: "u-manager", at }).state.stock[shoe.id]).toBe(3)
    expect(indexCatalog(state).variantById[shoe.id]).toBeTruthy()
  })
})

describe("shifts guard what is booked to them", () => {
  const sellInto = (state, shiftId, cashierId = "u-cashier") =>
    applySale(state, { lines: [{ variantId: shoe.id, quantity: 1 }], payments: [{ method: "cash", amount: shoe.price }], cashierId, shiftId, at })

  test("a sale needs an open shift on this counter, run by the same cashier", () => {
    const { state, record: shift } = withShift()
    const closed = applyCloseShift(state, { shiftId: shift.id, countedCash: 1000000, closedBy: "u-cashier", at }).state
    expect(() => sellInto(closed, shift.id)).toThrow("Open a shift before selling")
    expect(() => sellInto(state, "no-such-shift")).toThrow("Open a shift before selling")
    expect(() => sellInto(state, shift.id, "u-cashier-2")).toThrow("another cashier")
    const other = applyOpenShift(stocked(), { cashierId: "u-cashier", openingCash: 0, at, registerId: "reg-other" })
    expect(() => sellInto(other.state, other.record.id)).toThrow("another counter")
  })

  test("a closed shift's report does not change when a card refund is approved later", () => {
    const { state: opened, record: shift } = withShift()
    const { state: sold, record: sale } = applySale(opened, {
      lines: [{ variantId: shoe.id, quantity: 1 }],
      payments: [{ method: "card", amount: shoe.price }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
    })
    const { state: closedState, record: closed } = applyCloseShift(sold, { shiftId: shift.id, countedCash: 1000000, closedBy: "u-cashier", at })
    const before = shiftSummary(closedState, closed)
    const request = { saleId: sale.id, lines: [{ variantId: shoe.id, quantity: 1 }], reason: "Wrong size", method: "card", requestedBy: "u-manager", shiftId: shift.id, at }
    const { state: requested, record: refund } = applyRefundRequest(closedState, request)
    const { state: approved, record: decided } = applyRefundDecision(requested, { refundId: refund.id, approve: true, userId: "u-manager", at })

    expect(decided.approvedInShiftId).toBeNull()
    expect(shiftSummary(approved, closed)).toEqual(before)

    const { state: reopened, record: next } = applyOpenShift(requested, { cashierId: "u-cashier", openingCash: 0, at })
    const later = applyRefundDecision(reopened, { refundId: refund.id, approve: true, userId: "u-manager", at }).state
    expect(shiftSummary(later, next).cardRefunds).toBe(shoe.price)
    expect(shiftSummary(later, closed)).toEqual(before)
  })

  test("drawer amounts must be whole, non-negative numbers", () => {
    expect(() => applyOpenShift(stocked(), { cashierId: "u-cashier", openingCash: Number.NaN, at })).toThrow("whole amount")
    expect(() => applyOpenShift(stocked(), { cashierId: "u-cashier", openingCash: -1, at })).toThrow("whole amount")
    const { state, record: shift } = withShift()
    expect(() => applyCloseShift(state, { shiftId: shift.id, countedCash: Number.NaN, closedBy: "u-cashier", at })).toThrow("whole amount")
  })

  test("opening the same shift twice opens it once", () => {
    const first = applyOpenShift(stocked(), { cashierId: "u-cashier", openingCash: 0, at, clientId: "open-1" })
    const again = applyOpenShift(first.state, { cashierId: "u-cashier", openingCash: 0, at, clientId: "open-1" })
    expect(again.record.id).toBe(first.record.id)
    expect(again.state.shifts).toHaveLength(1)
  })
})

describe("stock inputs are checked before anything is booked", () => {
  test("unknown items and bad quantities or costs are refused with a clear message", () => {
    const state = stocked()
    expect(() => applyAdjustment(state, { variantId: "nope", quantity: 1, reason: "found", userId: "u-manager", at })).toThrow("Unknown item")
    expect(() => applyAdjustment(state, { variantId: shoe.id, quantity: 1.5, reason: "found", userId: "u-manager", at })).toThrow("whole number")
    const purchase = (line) => applyPurchase(state, { lines: [{ variantId: shoe.id, quantity: 1, unitCost: 100, ...line }], supplier: "Test", receivedBy: "u-manager", at })
    expect(() => purchase({ variantId: "nope" })).toThrow("Unknown item")
    expect(() => purchase({ quantity: 0.5 })).toThrow("at least 1")
    expect(() => purchase({ unitCost: -1 })).toThrow("Cost")
    expect(() => purchase({ unitCost: Number.NaN })).toThrow("Cost")
  })

  test("returned stock goes back at the cost it was sold at", () => {
    const { state: opened, record: shift } = withShift()
    const { state: sold, record: sale } = applySale(opened, {
      lines: [{ variantId: shoe.id, quantity: 1 }],
      payments: [{ method: "cash", amount: shoe.price }],
      cashierId: "u-cashier",
      shiftId: shift.id,
      at,
    })
    const repriced = { ...sold, variants: sold.variants.map((variant) => (variant.id === shoe.id ? { ...variant, cost: variant.cost + 50000 } : variant)) }
    const request = { saleId: sale.id, lines: [{ variantId: shoe.id, quantity: 1, restock: true }], reason: "Wrong size", method: "cash", requestedBy: "u-cashier", shiftId: shift.id, at }
    const { state: requested, record: refund } = applyRefundRequest(repriced, request)
    const { state } = applyRefundDecision(requested, { refundId: refund.id, approve: true, userId: "u-manager", at })
    expect(state.movements.at(-1)).toMatchObject({ type: "return", unitCost: shoe.cost })
  })
})
