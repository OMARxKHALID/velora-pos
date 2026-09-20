import { describe, expect, test } from "bun:test"
import { seedCatalog } from "@/features/catalog/lib/catalog"
import {
  applyCloseShift,
  applyOpenShift,
  applyPurchase,
  applyRefundDecision,
  applyRefundRequest,
  applySale,
  applySync,
  emptyLedger,
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
    expect(() => applySale(state, input)).toThrow("Manager approval")
    expect(applySale(state, { ...input, approvedBy: "u-manager" }).record.flags).toContain("big_discount")
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
})
