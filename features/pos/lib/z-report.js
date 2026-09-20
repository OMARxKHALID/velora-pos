import { shiftSummary } from "@/features/demo/lib/ledger"
import { staffName } from "@/features/demo/lib/staff"
import { formatFullDateTime } from "@/lib/dates"
import { toCsv } from "@/lib/csv"

export const generateZReportCsv = (state, shift) => {
  const summary = shiftSummary(state, shift)
  const shiftSales = (state.sales || []).filter((s) => s.shiftId === shift.id)
  const shiftRefunds = (state.refunds || []).filter((r) => r.shiftId === shift.id && r.status === "approved")

  const rows = [
    ["VELORA POS - END OF DAY Z-REPORT"],
    ["Generated At", formatFullDateTime(Date.now())],
    ["Shift ID", shift.id],
    ["Register / Counter", shift.registerId || "CTR-01"],
    ["Cashier", staffName(shift.cashierId)],
    ["Closed By", shift.closedBy ? staffName(shift.closedBy) : staffName(shift.cashierId)],
    ["Shift Opened", shift.openedAt ? formatFullDateTime(shift.openedAt) : "—"],
    ["Shift Closed", shift.closedAt ? formatFullDateTime(shift.closedAt) : "—"],
    ["Status", (shift.status || "closed").toUpperCase()],
    [],
    ["--- REVENUE & SALES SUMMARY ---"],
    ["Metric", "Value", "Notes"],
    ["Total Transactions", String(summary.saleCount), "Number of completed sales"],
    ["Total Units Sold", String(summary.itemCount), "Pairs / items"],
    ["Gross Sales (PKR)", String(((summary.revenue + summary.discounts) / 100).toFixed(2)), "Before discounts"],
    ["Total Discounts (PKR)", String((summary.discounts / 100).toFixed(2)), "Cart + product markdowns"],
    ["Net Sales Revenue (PKR)", String((summary.revenue / 100).toFixed(2)), "Final sales total"],
    ["Net Cash Sales (PKR)", String((summary.cashSales / 100).toFixed(2)), "Cash collected net of change"],
    ["Card Sales (PKR)", String((summary.cardSales / 100).toFixed(2)), "Bank POS terminal payments"],
    ["Refunds Count", String(shiftRefunds.length), "Approved customer refunds"],
    ["Cash Refunds (PKR)", String((summary.cashRefunds / 100).toFixed(2)), "Cash returned to customers"],
    [],
    ["--- CASH DRAWER RECONCILIATION ---"],
    ["Drawer Field", "Amount (PKR)"],
    ["Opening Float", String((summary.openingCash / 100).toFixed(2))],
    ["+ Cash Sales Received", String((summary.cashSales / 100).toFixed(2))],
    ["- Cash Refunds Given", String((summary.cashRefunds / 100).toFixed(2))],
    ["Expected Cash In Drawer", String((shift.expectedCash / 100).toFixed(2))],
    ["Actual Cash Counted", String((shift.countedCash / 100).toFixed(2))],
    ["Cash Variance (Over / Short)", String((shift.difference / 100).toFixed(2))],
    ["Variance Status", shift.difference === 0 ? "EXACT MATCH" : shift.difference > 0 ? "OVERAGE" : "SHORTAGE"],
    ["Closing Note", shift.closeNote || "None"],
    [],
    ["--- TRANSACTION AUDIT LOG ---"],
    ["Receipt #", "Date/Time", "Items", "Gross (PKR)", "Discount (PKR)", "Net (PKR)", "Payment Methods"],
    ...shiftSales.map((sale) => [
      sale.number,
      formatFullDateTime(sale.soldAt),
      String(sale.items?.length || 0),
      String(((sale.subtotal || sale.total) / 100).toFixed(2)),
      String(((sale.discountTotal || 0) / 100).toFixed(2)),
      String((sale.total / 100).toFixed(2)),
      (sale.payments || []).map((p) => `${p.method.toUpperCase()} (${(p.amount / 100).toFixed(2)})`).join("; "),
    ]),
  ]

  return toCsv(rows)
}
