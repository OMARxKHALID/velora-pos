"use client"

import { useStaffName } from "@/features/demo/hooks/use-directory"
import { formatFullDateTime } from "@/lib/dates"
import { formatMoney } from "@/lib/money"

const Row = ({ label, value, strong }) => (
  <div className={strong ? "flex justify-between gap-2 text-xs font-bold" : "flex justify-between gap-2"}>
    <span className="shrink-0">{label}</span>
    <span className="truncate text-right tabular-nums">{value}</span>
  </div>
)

// Printed on 80mm paper, so the type sizes here are fixed on purpose and do not follow the app's UI scale.
export const ZReportPrint = ({ shift, summary, printedAt, ref }) => {
  const nameOf = useStaffName()
  const diff = shift.difference ?? 0
  const diffLabel = diff === 0 ? "BALANCED (Rs 0)" : diff > 0 ? `OVER (+${formatMoney(diff)})` : `SHORT (${formatMoney(diff)})`

  return (
    <div ref={ref} className="mx-auto w-[302px] bg-white px-4 py-5 font-mono text-[11px] leading-relaxed text-black">
      <div className="text-center">
        <p className="font-heading text-xl font-bold tracking-[0.25em]">VELORA</p>
        <p className="text-[9px] font-semibold tracking-[0.35em] uppercase">End of Day · Z-Report</p>
        <p className="mt-1.5 text-[10px] text-zinc-700">Register closing report</p>
      </div>

      <div className="my-2.5 border-t border-dashed border-black" />

      <div className="space-y-0.5 text-[10px]">
        <Row label="Register" value={shift.registerId} />
        <Row label="Shift" value={shift.id.slice(0, 8)} />
        <Row label="Cashier" value={nameOf(shift.cashierId)} />
        {shift.closedBy && <Row label="Closed By" value={nameOf(shift.closedBy)} />}
        <Row label="Opened" value={shift.openedAt ? formatFullDateTime(shift.openedAt) : "—"} />
        <Row label="Closed" value={shift.closedAt ? formatFullDateTime(shift.closedAt) : "—"} />
      </div>

      <div className="my-2.5 border-t border-dashed border-black" />

      <p className="mb-1 text-center font-bold tracking-wider uppercase text-[10px]">Sales Summary</p>
      <div className="space-y-0.5">
        <Row label="Total Transactions" value={summary.saleCount} />
        <Row label="Items Sold" value={summary.itemCount} />
        <Row label="Gross Sales" value={formatMoney(summary.gross)} />
        {summary.discounts > 0 && <Row label="Total Discounts" value={`−${formatMoney(summary.discounts)}`} />}
        <Row label="NET SALES" value={formatMoney(summary.netSales)} strong />
        {summary.tax > 0 && <Row label="Tax Collected" value={formatMoney(summary.tax)} />}
        {summary.tax > 0 && <Row label="TOTAL COLLECTED" value={formatMoney(summary.revenue)} strong />}
      </div>

      <div className="my-2.5 border-t border-dashed border-black" />

      <p className="mb-1 text-center font-bold tracking-wider uppercase text-[10px]">Payment Tenders</p>
      <div className="space-y-0.5">
        <Row label="Cash Sales (Net)" value={formatMoney(summary.cashSales)} />
        <Row label="Card Payments" value={formatMoney(summary.cardSales)} />
        {summary.cardRefunds > 0 && <Row label="Card Refunds" value={`−${formatMoney(summary.cardRefunds)}`} />}
        {summary.cashRefunds > 0 && <Row label="Cash Refunds Paid" value={`−${formatMoney(summary.cashRefunds)}`} />}
      </div>

      <div className="my-2.5 border-t border-dashed border-black" />

      <p className="mb-1 text-center font-bold tracking-wider uppercase text-[10px]">Drawer Cash Audit</p>
      <div className="space-y-0.5">
        <Row label="Opening Float" value={formatMoney(summary.openingCash)} />
        <Row label="+ Cash Received" value={formatMoney(summary.cashSales)} />
        {summary.cashRefunds > 0 && <Row label="− Cash Refunds Paid" value={formatMoney(summary.cashRefunds)} />}
        <Row label="EXPECTED IN DRAWER" value={formatMoney(shift.expectedCash)} strong />
        <Row label="ACTUAL COUNTED" value={formatMoney(shift.countedCash)} strong />
        <Row label="DRAWER VARIANCE" value={diffLabel} strong />
      </div>

      {shift.closeNote && (
        <div className="mt-2 border-t border-dotted border-black/40 pt-1 text-[10px]">
          <p className="font-bold">Closing Note:</p>
          <p className="italic">“{shift.closeNote}”</p>
        </div>
      )}

      <div className="my-3 border-t border-dashed border-black" />

      <p className="text-center text-[9px] font-semibold tracking-wider uppercase">Demo report · not a tax document</p>
      <p className="mt-1 text-center text-[9px] text-zinc-600">Printed: {formatFullDateTime(printedAt ?? shift.closedAt ?? shift.openedAt ?? 0)}</p>
    </div>
  )
}
