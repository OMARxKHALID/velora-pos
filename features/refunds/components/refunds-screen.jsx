"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckIcon, XIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { TablePagination, paginate } from "@/components/ui/table-pagination"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { useStaffName } from "@/features/demo/hooks/use-directory"
import { openShiftFor } from "@/features/demo/lib/ledger"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { SaleDetailSheet } from "@/features/sales/components/sale-detail-sheet"
import { StatusBadge } from "@/features/sales/components/sale-status-badges"
import { formatDateTime, timeAgo } from "@/lib/dates"
import { formatMoney } from "@/lib/money"

const tabs = [
  { key: "pending", label: "To approve" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
]

const RefundCard = ({ refund, drawerOpen, onOpenSale, onDecide }) => {
  const needsDrawer = refund.method === "cash" && !drawerOpen
  const { productById, variantById } = useCatalog()
  const nameOf = useStaffName()
  return (
    <li className="flex flex-col gap-4 p-4 @2xl:flex-row @2xl:items-center">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenSale(refund.saleId)}
            className="font-mono text-xs text-gold underline-offset-4 hover:underline"
          >
            {refund.saleNumber}
          </button>
          <span className="text-xs text-muted-foreground">
            {nameOf(refund.requestedBy)} ·{" "}
            {refund.status === "pending"
              ? timeAgo(refund.createdAt)
              : formatDateTime(refund.createdAt)}
          </span>
          <StatusBadge tone={refund.method === "cash" ? "gold" : "info"}>
            {refund.method}
          </StatusBadge>
        </div>
        <ul className="space-y-0.5 text-sm">
          {refund.items.map(({ variantId, quantity, restock }) => {
            const variant = variantById[variantId]
            return (
              <li key={variantId} className="truncate">
                {quantity} × {productById[variant.productId].name}
                <span className="text-muted-foreground">
                  {" "}
                  · {variant.attributes.color} · EU {variant.attributes.size}
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDecide(refund, false)}
            >
              <XIcon />
              Reject
            </Button>
            <Button size="sm" disabled={needsDrawer} onClick={() => onDecide(refund, true)}>
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
  const refunds = useDemoStore(({ refunds }) => refunds)
  const decideRefund = useDemoStore(({ decideRefund }) => decideRefund)
  const drawerOpen = useDemoStore(({ shifts }) => Boolean(openShiftFor({ shifts })))
  const [tab, setTab] = useState("pending")
  const [page, setPage] = useState(1)
  const [openSaleId, setOpenSaleId] = useState(null)
  const counts = Object.groupBy(refunds, ({ status }) => status)
  const visible = (counts[tab] ?? []).toReversed()
  const pagination = paginate(visible, page)

  const handleDecide = (refund, approve) => {
    try {
      decideRefund({ refundId: refund.id, approve, userId: user.id })
      toast.success(approve ? "Refund approved" : "Refund rejected", {
        description: approve
          ? `${formatMoney(refund.total)} returned${refund.items.some(({ restock }) => restock) ? ", stock updated" : ""}.`
          : refund.saleNumber,
      })
    } catch (error) {
      toast.error(error.message)
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

      <div className="border bg-card">
        {visible.length ? (
          <ul className="divide-y">
            {pagination.rows.map((refund) => (
              <RefundCard key={refund.id} refund={refund} drawerOpen={drawerOpen} onOpenSale={setOpenSaleId} onDecide={handleDecide} />
            ))}
          </ul>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {tab === "pending" ? "Nothing waiting. Refund requests from cashiers appear here." : `No ${tab} refunds yet.`}
          </p>
        )}
        <TablePagination {...pagination} onPageChange={setPage} />
      </div>

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
