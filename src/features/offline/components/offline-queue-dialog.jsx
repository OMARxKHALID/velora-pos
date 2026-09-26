"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { ArrowsClockwiseIcon, CloudArrowUpIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { timeAgo } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"

const ReceiptDialog = dynamic(() => import("@/features/pos/components/receipt-dialog").then((mod) => mod.ReceiptDialog))

const Entry = ({ entry, onRetry, onRemove, onView }) => {
  const [confirming, setConfirming] = useState(false)
  const { sale } = entry
  const count = sale.items.reduce((sum, { quantity }) => sum + quantity, 0)
  return (
    <li className="space-y-2 border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onView} className="min-w-0 text-left">
          <p className="font-mono text-sm font-semibold">{sale.number}</p>
          <p className="text-xs text-muted-foreground">
            {count} {count === 1 ? "item" : "items"} · {timeAgo(sale.soldAt)}
          </p>
        </button>
        <span className="shrink-0 font-semibold tabular-nums">{formatMoney(sale.total)}</span>
      </div>
      {entry.status === "failed" && (
        <>
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <WarningIcon className="mt-0.5 size-3.5 shrink-0" weight="fill" />
            {entry.error}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {confirming ? (
              <>
                <span className="mr-auto self-center text-xs text-muted-foreground">Remove it from this till? Tell your supervisor about this sale first.</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  Keep
                </Button>
                <Button size="sm" variant="destructive" onClick={onRemove}>
                  Remove
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setConfirming(true)}>
                  <TrashIcon />
                  Remove
                </Button>
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <ArrowsClockwiseIcon />
                  Try again
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </li>
  )
}

export const OfflineQueueDialog = ({ onClose }) => {
  const pending = useLedgerStore(({ pending }) => pending)
  const offline = useLedgerStore(({ offline }) => offline)
  const syncing = useLedgerStore(({ syncing }) => syncing)
  const syncOutbox = useLedgerStore(({ syncOutbox }) => syncOutbox)
  const retryOffline = useLedgerStore(({ retryOffline }) => retryOffline)
  const removeOffline = useLedgerStore(({ removeOffline }) => removeOffline)
  const [viewing, setViewing] = useState(null)

  const handle = (work) => async () => {
    try {
      await work()
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (viewing) return <ReceiptDialog sale={viewing} onClose={() => setViewing(null)} />

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sales saved on this till</DialogTitle>
          <DialogDescription>
            {pending.length
              ? "These sales were made without a connection. They upload by themselves when the internet is back."
              : "Everything sold on this till has reached the server."}
          </DialogDescription>
        </DialogHeader>
        {pending.length > 0 && (
          <ul className="max-h-[50dvh] space-y-2 overflow-y-auto">
            {pending.map((entry) => (
              <Entry
                key={entry.clientId}
                entry={entry}
                onView={() => setViewing(entry.sale)}
                onRetry={handle(() => retryOffline(entry.clientId))}
                onRemove={handle(() => removeOffline(entry.clientId))}
              />
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={offline || syncing || !pending.length} onClick={handle(syncOutbox)}>
            <CloudArrowUpIcon />
            {syncing ? "Uploading…" : "Upload now"}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
