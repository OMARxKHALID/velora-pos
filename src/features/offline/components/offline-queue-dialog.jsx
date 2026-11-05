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
import { approveDiscardAction } from "@/features/auth/actions"
import { ReceiptDialog } from "@/features/pos/components/lazy-receipt-dialog"
import { ManagerApprovalDialog } from "@/features/pos/components/manager-approval-dialog"

const Entry = ({ entry, busy, onRetry, onRemove, onView }) => {
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
            <Button size="sm" variant="ghost" className="text-muted-foreground" pending={busy} disabled={busy} onClick={onRemove}>
              <TrashIcon />
              Remove
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={onRetry}>
              <ArrowsClockwiseIcon />
              Try again
            </Button>
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
  const [removing, setRemoving] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const handle = (work) => async () => {
    try {
      await work()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleRemoved = async (_approvedBy, approvalToken) => {
    const entry = removing
    setRemoving(null)
    setBusyId(entry.clientId)
    await handle(async () => {
      await removeOffline(entry.clientId, approvalToken)
      toast.success("Sale removed", { description: `${entry.sale.number} was deleted from this till.` })
    })()
    setBusyId(null)
  }

  if (viewing) return <ReceiptDialog sale={viewing} viewOnly onClose={() => setViewing(null)} />

  if (removing) {
    return (
      <ManagerApprovalDialog
        shopId={removing.sale.shopId}
        reason={`Removing ${removing.sale.number} (${formatMoney(removing.sale.total)}) deletes it from this till for good. It never reaches the shop's records or stock. The owner sees the cashier and the approving supervisor in the log.`}
        onCheck={(supervisorId, pin) => approveDiscardAction(supervisorId, pin, removing.clientId)}
        onApprove={handleRemoved}
        onClose={() => setRemoving(null)}
      />
    )
  }

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
          <ItemGroup className="gap-2">
            {pending.map((entry) => (
              <Entry
                key={entry.clientId}
                entry={entry}
                busy={busyId === entry.clientId}
                onView={() => setViewing(entry.sale)}
                onRetry={handle(() => retryOffline(entry.clientId))}
                onRemove={() => setRemoving(entry)}
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
