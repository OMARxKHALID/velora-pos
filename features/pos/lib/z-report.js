import { shiftSummary } from "@/features/demo/lib/ledger"
import { staffName } from "@/features/demo/lib/staff"
import { formatFullDateTime } from "@/lib/dates"
import { toCsv } from "@/lib/csv"
import { methodLabel } from "./payment-methods"

const rupees = (paisa) => (paisa / 100).toFixed(2)

export const generateZReportCsv = (state, shift, staff) => {
  const summary = shiftSummary(state, shift)
  const shiftSales = state.sales.filter((sale) => sale.shiftId === shift.id)
  const nameOf = (id) => staffName(id, staff)

  const rows = [
    ["VELORA POS - END OF DAY Z-REPORT"],
    ["Generated At", formatFullDateTime(Date.now())],
    ["Shift ID", shift.id],
    ["Register / Counter", shift.registerId],
    ["Cashier", nameOf(shift.cashierId)],
    ["Closed By", nameOf(shift.closedBy ?? shift.cashierId)],
    ["Shift Opened", shift.openedAt ? formatFullDateTime(shift.openedAt) : "—"],
    ["Shift Closed", shift.closedAt ? formatFullDateTime(shift.closedAt) : "—"],
    ["Status", shift.status.toUpperCase()],
    [],
    ["--- SALES SUMMARY ---"],
    ["Metric", "Value", "Notes"],
    ["Total Transactions", String(summary.saleCount), "Number of completed sales"],
    ["Total Units Sold", String(summary.itemCount), "Items sold"],
    ["Gross Sales (PKR)", rupees(summary.gross), "Before discounts"],
    ["Total Discounts (PKR)", rupees(summary.discounts), "Cart discounts + shop offers"],
    ["Net Sales (PKR)", rupees(summary.netSales), "After discounts, before tax"],
    ["Tax Collected (PKR)", rupees(summary.tax), "Added on top of net sales"],
    ["FBR POS Fees (PKR)", rupees(summary.serviceFees), "Rs 1 per FBR invoice, not counted as sales"],
    ["Total Collected (PKR)", rupees(summary.revenue), "Net sales + tax + FBR fees"],
    ["FBR Invoices Reported", String(summary.fbrReported), "Simulated in the demo"],
    ["FBR Invoices Pending", String(summary.fbrPending), "Reported when the counter is back online"],
    ["Net Cash Sales (PKR)", rupees(summary.cashSales), "Cash collected net of change"],
    ["Card Sales (PKR)", rupees(summary.cardSales), "Bank POS terminal payments"],
    ...Object.entries(summary.otherSales ?? {}).map(([method, amount]) => [`${methodLabel(method)} (PKR)`, rupees(amount), "Wallet or bank payments"]),
    ...Object.entries(summary.otherRefunds ?? {}).map(([method, amount]) => [`${methodLabel(method)} Refunds (PKR)`, rupees(amount), "Paid back the same way"]),
    ["Cash Rounding Given (PKR)", rupees(-(summary.cashRounding ?? 0)), "Rounded down on all-cash sales"],
    ["No-sale Drawer Opens", String(summary.noSaleOpens ?? 0), "Drawer opened without a sale"],
    ["Card Refunds (PKR)", rupees(summary.cardRefunds), "Card refunds approved during this shift"],
    ["Cash Refunds Paid (PKR)", rupees(summary.cashRefunds), "Cash paid out of this drawer"],
    [],
    ["--- CASH DRAWER RECONCILIATION ---"],
    ["Drawer Field", "Amount (PKR)"],
    ["Opening Float", rupees(summary.openingCash)],
    ["+ Cash Sales Received", rupees(summary.cashSales)],
    ["- Cash Refunds Paid", rupees(summary.cashRefunds)],
    ["Expected Cash In Drawer", rupees(shift.expectedCash)],
    ["Actual Cash Counted", rupees(shift.countedCash)],
    ["Cash Variance (Over / Short)", rupees(shift.difference)],
    ["Variance Status", shift.difference === 0 ? "EXACT MATCH" : shift.difference > 0 ? "OVERAGE" : "SHORTAGE"],
    ["Closing Note", shift.closeNote || "None"],
    [],
    ["--- TRANSACTION AUDIT LOG ---"],
    ["Receipt #", "Date/Time", "Items", "Gross (PKR)", "Discount (PKR)", "Tax (PKR)", "Total (PKR)", "Payment Methods", "FBR Invoice #"],
    ...shiftSales.map((sale) => [
      sale.number,
      formatFullDateTime(sale.soldAt),
      String(sale.items.length),
      rupees(sale.subtotal),
      rupees(sale.discountTotal),
      rupees(sale.taxTotal ?? 0),
      rupees(sale.total),
      sale.payments.map((payment) => `${payment.method.toUpperCase()} (${rupees(payment.amount)})`).join("; "),
      sale.fbr ? (sale.fbr.invoiceNumber ?? "PENDING") : "",
    ]),
  ]

  return toCsv(rows)
}
