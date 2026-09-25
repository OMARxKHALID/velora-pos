"use client"

import { useRef } from "react"
import { CheckCircleIcon, FileCsvIcon, PrinterIcon, WarningIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { shiftSummary } from "@/features/ledger/lib/rules"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { downloadFrom } from "@/lib/download"
import { formatTime } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { printNode } from "../lib/print-node"
import { ZReportPrint } from "./z-report-print"

const Line = ({ label, value, strong, className }) => (
  <div className={cn("flex justify-between py-1.5", strong && "font-semibold text-foreground", className)}>
    <dt>{label}</dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
)

export const ShiftReportDialog = ({ shift, onClose }) => {
  const printRef = useRef(null)
  const nameOf = useStaffName()
  const summary = shiftSummary({ sales: [], refunds: [] }, shift)
  const { difference } = shift
  const tone = difference === 0 ? "success" : difference < 0 ? "destructive" : "warning"
  const verdict = difference === 0 ? "Cash matches" : difference < 0 ? `Short by ${formatMoney(-difference)}` : `Over by ${formatMoney(difference)}`

  const handleExportCsv = () => {
    downloadFrom(`/api/reports/z/${encodeURIComponent(shift.id)}`)
    toast.success("Z-Report exported", { description: "Downloaded CSV report for Excel and accounting." })
  }

  const handlePrint = () => {
    if (printRef.current) {
      printNode(printRef.current, { paper: "receipt" })
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>End-of-Day Z-Report</DialogTitle>
            <span className="font-mono text-xs text-muted-foreground uppercase">#{shift.id.slice(0, 8)}</span>
          </div>
          <DialogDescription>
            {nameOf(shift.cashierId)} · {formatTime(shift.openedAt)} to {formatTime(shift.closedAt)}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "flex items-center gap-3 border px-4 py-3",
            tone === "success" && "border-success/40 bg-success/10 text-success",
            tone === "destructive" && "border-destructive/40 bg-destructive/10 text-destructive",
            tone === "warning" && "border-warning/40 bg-warning/10 text-warning"
          )}
        >
          {tone === "success" ? <CheckCircleIcon className="size-6 shrink-0" weight="fill" /> : <WarningIcon className="size-6 shrink-0" weight="fill" />}
          <div>
            <p className="font-heading text-lg font-bold tracking-wider uppercase">{verdict}</p>
            {tone !== "success" && <p className="text-xs">Flagged for the owner on the dashboard.</p>}
          </div>
        </div>

        <dl className="divide-y text-sm text-muted-foreground">
          <Line label="Opening cash" value={formatMoney(summary.openingCash)} />
          <Line label="Cash sales" value={`+ ${formatMoney(summary.cashSales)}`} />
          <Line label="Cash refunds paid" value={`− ${formatMoney(summary.cashRefunds)}`} />
          <Line label="Expected in drawer" value={formatMoney(shift.expectedCash)} strong />
          <Line label="Counted" value={formatMoney(shift.countedCash)} strong />
        </dl>

        <dl className="grid grid-cols-3 border text-center">
          {[
            ["Sales", summary.saleCount],
            ["Net sales", formatMoney(summary.netSales)],
            ["Card", formatMoney(summary.cardSales)],
          ].map(([label, value]) => (
            <div key={label} className="border-r px-2 py-3 last:border-r-0">
              <dt className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">{label}</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        {summary.tax > 0 && (
          <p className="text-xs text-muted-foreground">
            Tax collected {formatMoney(summary.tax)} · total collected {formatMoney(summary.revenue)}
          </p>
        )}

        {shift.closeNote && <p className="border-l-2 border-primary pl-3 text-sm text-muted-foreground">“{shift.closeNote}”</p>}

        <div className="sr-only">
          <ZReportPrint ref={printRef} shift={shift} summary={summary} />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button type="button" variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handlePrint}>
              <PrinterIcon />
              Print Z-Report
            </Button>
            <Button type="button" variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleExportCsv}>
              <FileCsvIcon />
              Export CSV
            </Button>
          </div>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
