import { sumBy } from "@/lib/money"

export const refundsBySale = (refunds) => Object.groupBy(refunds, ({ saleId }) => saleId)

export const saleRefundState = (sale, refunds = []) => {
  const pending = refunds.some(({ status }) => status === "pending")
  const refundedQty = sumBy(
    refunds.filter(({ status }) => status === "approved"),
    ({ items }) => sumBy(items, ({ quantity }) => quantity)
  )
  const soldQty = sumBy(sale.items, ({ quantity }) => quantity)
  const refunded = refundedQty === 0 ? null : refundedQty >= soldQty ? "full" : "partial"
  return { pending, refunded }
}
