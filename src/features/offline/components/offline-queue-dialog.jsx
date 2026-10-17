"use client"

import { useState } from "react"
import { ArrowsClockwiseIcon, CloudArrowUpIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup } from "@/shared/components/ui/item"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { timeAgo } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import { ReceiptDialog } from "@/features/pos/components/lazy-receipt-dialog"

const Entry = ({ entry, onRetry, onRemove, onView }) => {
  const [confirming, setConfirming] = useState(false)
  const { sale } = entry
  const count = sale.items.reduce((sum, { quantity }) => sum + quantity, 0)
  return (
    <Item role="listitem" variant="outline" size="xs" className="items-start gap-y-2 p-3">
      <ItemContent>
        <Button variant="link" size="inline" onClick={onView} className="w-fit font-mono text-sm font-semibold text-foreground no-underline hover:underline">
          {sale.number}
        </Button>
        <ItemDescription>
          {count} {count === 1 ? "item" : "items"} · {timeAgo(sale.soldAt)}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="font-semibold tabular-nums">{formatMoney(sale.total)}</ItemActions>
      {entry.status === "failed" && (
        <ItemFooter className="flex-col items-stretch">
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <WarningIcon className="mt-0.5 size-3.5 shrink-0" weight="fill" />
            {entry.error}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {confirming ? (
              <>
                <span className="mr-auto self-center text-xs text-muted-foreground">This deletes the sale from this till. It is recorded under your name for the owner.</span>
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
        </ItemFooter>
      )}
    </Item>
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
          <ItemGroup className="max-h-[50dvh] gap-2 overflow-y-auto">
            {pending.map((entry) => (
              <Entry
                key={entry.clientId}
                entry={entry}
                onView={() => setViewing(entry.sale)}
                onRetry={handle(() => retryOffline(entry.clientId))}
                onRemove={handle(() => removeOffline(entry.clientId))}
              />
            ))}
          </ItemGroup>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={offline || !pending.length} pending={syncing} onClick={handle(syncOutbox)}>
            <CloudArrowUpIcon />
            Upload now
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
