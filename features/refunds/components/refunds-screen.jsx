"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CheckIcon, XIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { TablePagination, paginate } from "@/components/ui/table-pagination"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { staffName } from "@/features/demo/lib/staff"
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

const RefundCard = ({ refund, onOpenSale, onDecide }) => {
  const { productById, variantById } = useCatalog()
  return (
    <li className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
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
            {staffName(refund.requestedBy)} ·{" "}
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
        {refund.decidedBy && (
          <p className="text-xs text-muted-foreground">
            {refund.status} by {staffName(refund.decidedBy)} ·{" "}
            {formatDateTime(refund.decidedAt)}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 md:flex-col md:flex-nowrap md:items-end">
        <span className="font-heading text-xl font-bold text-gold tabular-nums">
          {formatMoney(refund.total)}
        </span>
        {refund.status === "pending" && (
          <div className="ml-auto flex gap-2 md:ml-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDecide(refund, false)}
            >
              <XIcon />
              Reject
            </Button>
            <Button size="sm" onClick={() => onDecide(refund, true)}>
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
              <RefundCard key={refund.id} refund={refund} onOpenSale={setOpenSaleId} onDecide={handleDecide} />
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
