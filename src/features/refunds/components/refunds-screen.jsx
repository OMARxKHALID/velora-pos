"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckIcon, XIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"
import { Segmented } from "@/shared/components/ui/segmented"
import { TablePagination, paginate } from "@/shared/components/ui/table-pagination"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { openShiftFor } from "@/features/ledger/lib/rules"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { SaleDetailSheet } from "@/features/sales/components/sale-detail-sheet"
import { StatusBadge } from "@/features/sales/components/sale-status-badges"
import { formatDateTime, timeAgo } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import { sizeLabel } from "@/features/catalog/lib/catalog"
import { methodLabel } from "@/features/pos/lib/payment-methods"
import { Surface } from "@/shared/components/ui/surface"
import { Empty, EmptyDescription } from "@/shared/components/ui/empty"

const tabs = [
  { key: "pending", label: "To approve" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

const decisionText = ({ refund, approve }, nameOf) =>
  approve
    ? `${formatMoney(refund.total)} goes back to the customer via ${methodLabel(refund.method)}${refund.method === "cash" ? " from the open drawer" : ""}. This cannot be undone.`
    : `${nameOf(refund.requestedBy)}'s request on ${refund.saleNumber} will be closed. This cannot be undone.`

const DecideDialog = ({ decision, busy, onConfirm, onClose }) => {
  const nameOf = useStaffName()
  const { refund, approve } = decision
  return (
    <AlertDialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{approve ? "Approve return?" : "Reject return?"}</AlertDialogTitle>
          <AlertDialogDescription>{decisionText(decision, nameOf)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep waiting</AlertDialogCancel>
          <Button variant={approve ? "default" : "destructive"} pending={busy} onClick={onConfirm}>
            {approve ? `Approve ${formatMoney(refund.total)}` : "Reject return"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const RefundCard = ({ refund, drawerOpen, onOpenSale, onDecide }) => {
  const needsDrawer = refund.method === "cash" && !drawerOpen
  const { productById, variantById } = useCatalog()
  const nameOf = useStaffName()
  return (
    <li className="flex flex-col gap-4 p-4 @2xl:flex-row @2xl:items-center">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="link" size="inline" onClick={() => onOpenSale(refund.saleId)} className="font-mono font-normal no-underline hover:underline">
            {refund.saleNumber}
          </Button>
          <span className="text-xs text-muted-foreground">
            {nameOf(refund.requestedBy)} ·{" "}
            {refund.status === "pending"
              ? timeAgo(refund.createdAt)
              : formatDateTime(refund.createdAt)}
          </span>
          <StatusBadge tone={refund.method === "cash" ? "gold" : "info"}>
            {methodLabel(refund.method)}
          </StatusBadge>
          {refund.syncedAt === null && <StatusBadge tone="info">Not synced</StatusBadge>}
        </div>
        <ul className="space-y-0.5 text-sm">
          {refund.items.map(({ variantId, quantity, restock }) => {
            const variant = variantById[variantId]
            return (
              <li key={variantId} className="truncate">
                {quantity} × {productById[variant.productId].name}
                <span className="text-muted-foreground">
                  {" "}
                  · {variant.attributes.color} · {sizeLabel(variant.attributes.size)}
                  {!restock && " · not restocked"}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="text-sm text-muted-foreground">“{refund.reason}”</p>
        {refund.status === "pending" && refund.method === "cash" && (
          <p className="text-xs text-muted-foreground">
            {needsDrawer ? "No counter shift is open. A cashier has to open one before this cash can be paid out." : "Cash is paid from whichever drawer is open when you approve."}
          </p>
        )}
        {refund.decidedBy && (
          <p className="text-xs text-muted-foreground">
            {refund.status} by {nameOf(refund.decidedBy)} ·{" "}
            {formatDateTime(refund.decidedAt)}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 @2xl:flex-col @2xl:flex-nowrap @2xl:items-end">
        <div className="flex flex-col @2xl:items-end">
          <span className="font-sans text-xl font-bold text-gold tabular-nums">{formatMoney(refund.total)}</span>
          {refund.taxTotal > 0 && <span className="text-xs text-muted-foreground tabular-nums">incl. {formatMoney(refund.taxTotal)} tax</span>}
        </div>
        {refund.status === "pending" && (
          <div className="ml-auto flex gap-2 @2xl:ml-0">
            <Button size="sm" variant="outline" onClick={() => onDecide({ refund, approve: false })}>
              <XIcon />
              Reject
            </Button>
            <Button size="sm" disabled={needsDrawer} onClick={() => onDecide({ refund, approve: true })}>
              <CheckIcon />
              Approve
            </Button>
          </div>
        )}
      </div>
    </li>
  )
}

export const RefundsScreen = ({ user }) => {
  const allRefunds = useLedgerStore(({ refunds }) => refunds)
  const scope = useShopScope(user)
  const refunds = scope === ALL_SHOPS ? allRefunds : allRefunds.filter(({ shopId }) => shopId === scope)
  const decideRefund = useLedgerStore(({ decideRefund }) => decideRefund)
  const drawerOpen = useLedgerStore(({ shifts }) => Boolean(openShiftFor({ shifts })))
  const [tab, setTab] = useState("pending")
  const [page, setPage] = useState(1)
  const [openSaleId, setOpenSaleId] = useState(null)
  const [deciding, setDeciding] = useState(null)
  const [busy, setBusy] = useState(false)
  const counts = Object.groupBy(refunds, ({ status }) => status)
  const visible = (counts[tab] ?? []).toReversed()
  const pagination = paginate(visible, page)

  const handleDecide = async () => {
    const { refund, approve } = deciding
    setBusy(true)
    try {
      await decideRefund({ refundId: refund.id, approve })
      setDeciding(null)
      toast.success(approve ? "Return approved" : "Return rejected", {
        description: approve
          ? `${formatMoney(refund.total)} returned${refund.items.some(({ restock }) => restock) ? ", stock updated" : ""}.`
          : refund.saleNumber,
      })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Segmented
        options={tabs.map(({ key, label }) => ({ key, label: `${label} · ${counts[key]?.length ?? 0}` }))}
        value={tab}
        onChange={(key) => {
          setTab(key)
          setPage(1)
        }}
      />

      <Surface>
        {visible.length ? (
          <ul className="divide-y">
            {pagination.rows.map((refund) => (
              <RefundCard key={refund.id} refund={refund} drawerOpen={drawerOpen} onOpenSale={setOpenSaleId} onDecide={setDeciding} />
            ))}
          </ul>
        ) : (
          <Empty><EmptyDescription>{tab === "pending" ? "Nothing waiting. Return requests from cashiers appear here." : `No ${tab} returns yet.`}</EmptyDescription></Empty>
        )}
        <TablePagination {...pagination} onPageChange={setPage} />
      </Surface>

      {deciding && <DecideDialog decision={deciding} busy={busy} onConfirm={handleDecide} onClose={() => setDeciding(null)} />}

      {openSaleId && (
        <SaleDetailSheet
          saleId={openSaleId}
          user={user}
          onClose={() => setOpenSaleId(null)}
        />
      )}
    </>
  )
}
