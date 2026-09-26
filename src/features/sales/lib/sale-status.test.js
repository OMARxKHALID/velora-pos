import { expect, test } from "bun:test"
import { refundsBySale, saleRefundState } from "./sale-status"

const sale = { id: "s1", items: [{ variantId: "a", quantity: 2 }, { variantId: "b", quantity: 1 }] }
const refund = (status, quantity) => ({ saleId: "s1", status, items: [{ variantId: "a", quantity }] })

test("a sale reads as pending, partly or fully refunded", () => {
  expect(saleRefundState(sale)).toEqual({ pending: false, refunded: null })
  expect(saleRefundState(sale, [refund("pending", 1)])).toEqual({ pending: true, refunded: null })
  expect(saleRefundState(sale, [refund("approved", 1)])).toEqual({ pending: false, refunded: "partial" })
  expect(saleRefundState(sale, [refund("approved", 2), { saleId: "s1", status: "approved", items: [{ variantId: "b", quantity: 1 }] }]).refunded).toBe("full")
  expect(saleRefundState(sale, [refund("rejected", 2)]).refunded).toBeNull()
})

test("refunds are grouped by sale", () => {
  expect(refundsBySale([refund("pending", 1), { ...refund("approved", 1), saleId: "s2" }])).toEqual({ s1: [refund("pending", 1)], s2: [{ ...refund("approved", 1), saleId: "s2" }] })
})
