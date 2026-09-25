"use client"

import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { formatFullDateTime } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { methodLabel } from "../lib/payment-methods"
import { PrintRow, PrintRule } from "./print-parts"
export const ZReportPrint = ({ shift, summary, printedAt, ref }) => {
  const nameOf = useStaffName()
  const diff = shift.difference ?? 0
  const diffLabel = diff === 0 ? "BALANCED (Rs 0)" : diff > 0 ? `OVER (+${formatMoney(diff)})` : `SHORT (${formatMoney(diff)})`

  return (
    <div ref={ref} className="mx-auto w-[302px] bg-white px-4 py-5 font-mono text-[11px] leading-relaxed text-black">
      <div className="text-center">
        <p className="font-heading text-xl font-bold tracking-[0.3em]">VELORA</p>
        <p className="text-[9px] font-semibold tracking-[0.35em] uppercase">End of Day · Z-Report</p>
        <p className="mt-1.5 text-[10px] text-zinc-700">Register closing report</p>
      </div>

      <PrintRule />

      <div className="space-y-0.5 text-[10px]">
        <PrintRow label="Counter" value={shift.registerCode} />
        <PrintRow label="Shift" value={shift.id.slice(0, 8)} />
        <PrintRow label="Cashier" value={nameOf(shift.cashierId)} />
        {shift.closedBy && <PrintRow label="Closed By" value={nameOf(shift.closedBy)} />}
        <PrintRow label="Opened" value={shift.openedAt ? formatFullDateTime(shift.openedAt) : "—"} />
        <PrintRow label="Closed" value={shift.closedAt ? formatFullDateTime(shift.closedAt) : "—"} />
      </div>

      <PrintRule />

      <p className="mb-1 text-center font-bold tracking-wider uppercase text-[10px]">Sales Summary</p>
      <div className="space-y-0.5">
        <PrintRow label="Total Transactions" value={summary.saleCount} />
        <PrintRow label="Items Sold" value={summary.itemCount} />
        <PrintRow label="Gross Sales" value={formatMoney(summary.gross)} />
        {summary.discounts > 0 && <PrintRow label="Total Discounts" value={`−${formatMoney(summary.discounts)}`} />}
        <PrintRow label="NET SALES" value={formatMoney(summary.netSales)} strong />
        {summary.tax > 0 && <PrintRow label="Tax Collected" value={formatMoney(summary.tax)} />}
        {summary.serviceFees > 0 && <PrintRow label="FBR POS Fees" value={formatMoney(summary.serviceFees)} />}
        {summary.cashRounding < 0 && <PrintRow label="Cash Rounding Given" value={`−${formatMoney(-summary.cashRounding)}`} />}
        {(summary.tax > 0 || summary.serviceFees > 0) && <PrintRow label="TOTAL COLLECTED" value={formatMoney(summary.revenue)} strong />}
      </div>

      {summary.fbrReported + summary.fbrPending > 0 && (
        <>
          <PrintRule />
          <p className="mb-1 text-center font-bold tracking-wider uppercase text-[10px]">FBR Reporting (Simulated)</p>
          <div className="space-y-0.5">
            <PrintRow label="Invoices Reported" value={summary.fbrReported} />
            <PrintRow label="Waiting To Report" value={summary.fbrPending} />
          </div>
        </>
      )}

      <PrintRule />

      <p className="mb-1 text-center font-bold tracking-wider uppercase text-[10px]">Payment Tenders</p>
      <div className="space-y-0.5">
        <PrintRow label="Cash Sales (Net)" value={formatMoney(summary.cashSales)} />
        <PrintRow label="Card Payments" value={formatMoney(summary.cardSales)} />
        {Object.entries(summary.otherSales ?? {})
          .filter(([, amount]) => amount > 0)
          .map(([method, amount]) => (
            <PrintRow key={method} label={methodLabel(method)} value={formatMoney(amount)} />
          ))}
        {Object.entries(summary.otherRefunds ?? {})
          .filter(([, amount]) => amount > 0)
          .map(([method, amount]) => (
            <PrintRow key={`${method}-refund`} label={`${methodLabel(method)} Refunds`} value={`−${formatMoney(amount)}`} />
          ))}
        {summary.cardRefunds > 0 && <PrintRow label="Card Refunds" value={`−${formatMoney(summary.cardRefunds)}`} />}
        {summary.cashRefunds > 0 && <PrintRow label="Cash Refunds Paid" value={`−${formatMoney(summary.cashRefunds)}`} />}
      </div>

      <PrintRule />

      <p className="mb-1 text-center font-bold tracking-wider uppercase text-[10px]">Drawer Cash Audit</p>
      <div className="space-y-0.5">
        <PrintRow label="Opening Float" value={formatMoney(summary.openingCash)} />
        {summary.noSaleOpens > 0 && <PrintRow label="No-sale Drawer Opens" value={summary.noSaleOpens} />}
        <PrintRow label="+ Cash Received" value={formatMoney(summary.cashSales)} />
        {summary.cashRefunds > 0 && <PrintRow label="− Cash Refunds Paid" value={formatMoney(summary.cashRefunds)} />}
        <PrintRow label="EXPECTED IN DRAWER" value={formatMoney(shift.expectedCash)} strong />
        <PrintRow label="ACTUAL COUNTED" value={formatMoney(shift.countedCash)} strong />
        <PrintRow label="DRAWER VARIANCE" value={diffLabel} strong />
      </div>

      {shift.closeNote && (
        <div className="mt-2 border-t border-dotted border-black/40 pt-1 text-[10px]">
          <p className="font-bold">Closing Note:</p>
          <p className="italic">“{shift.closeNote}”</p>
        </div>
      )}

      <PrintRule className="my-3" />

      <p className="text-center text-[9px] font-semibold tracking-wider uppercase">Not a tax document</p>
      <p className="mt-1 text-center text-[9px] text-zinc-600">Printed: {formatFullDateTime(printedAt ?? shift.closedAt ?? shift.openedAt ?? 0)}</p>
    </div>
  )
}
