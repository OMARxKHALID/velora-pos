"use client"

import { CheckCircleIcon, WarningIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { shiftSummary } from "@/features/demo/lib/ledger"
import { staffName } from "@/features/demo/lib/staff"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { formatMoney } from "@/lib/money"

const time = new Intl.DateTimeFormat("en-PK", { hour: "numeric", minute: "2-digit" })

const Line = ({ label, value, strong, className }) => (
  <div className={cn("flex justify-between py-1.5", strong && "font-semibold text-foreground", className)}>
    <dt>{label}</dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
)

export const ShiftReportDialog = ({ shift, onClose }) => {
  const sales = useDemoStore(({ sales }) => sales)
  const refunds = useDemoStore(({ refunds }) => refunds)
  const summary = shiftSummary({ sales, refunds }, shift)
  const { difference } = shift
  const tone = difference === 0 ? "success" : difference < 0 ? "destructive" : "warning"
  const verdict = difference === 0 ? "Cash matches" : difference < 0 ? `Short by ${formatMoney(-difference)}` : `Over by ${formatMoney(difference)}`

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Shift report</DialogTitle>
          <DialogDescription>
            {staffName(shift.cashierId)} · {time.format(shift.openedAt)} to {time.format(shift.closedAt)}
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
          {tone === "success" ? <CheckCircleIcon className="size-6" weight="fill" /> : <WarningIcon className="size-6" weight="fill" />}
          <div>
            <p className="font-heading text-lg font-bold tracking-wider uppercase">{verdict}</p>
            {tone !== "success" && <p className="text-xs">Flagged for the manager and shown on the dashboard.</p>}
          </div>
        </div>

        <dl className="divide-y text-sm text-muted-foreground">
          <Line label="Opening cash" value={formatMoney(summary.openingCash)} />
          <Line label="Cash sales" value={`+ ${formatMoney(summary.cashSales)}`} />
          <Line label="Cash refunds" value={`− ${formatMoney(summary.cashRefunds)}`} />
          <Line label="Expected in drawer" value={formatMoney(shift.expectedCash)} strong />
          <Line label="Counted" value={formatMoney(shift.countedCash)} strong />
        </dl>

        <dl className="grid grid-cols-3 border text-center">
          {[
            ["Sales", summary.saleCount],
            ["Revenue", formatMoney(summary.revenue)],
            ["Card", formatMoney(summary.cardSales)],
          ].map(([label, value]) => (
            <div key={label} className="border-r px-2 py-3 last:border-r-0">
              <dt className="text-[0.6rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">{label}</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        {shift.closeNote && <p className="border-l-2 border-primary pl-3 text-sm text-muted-foreground">“{shift.closeNote}”</p>}

        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
