"use client"

import { useRef, useState } from "react"
import {
  ArrowUUpLeftIcon,
  LockSimpleIcon,
  PrinterIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { refundableQuantity } from "@/features/ledger/lib/rules"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { useQuery } from "@tanstack/react-query"
import { getJson } from "@/lib/get-json"
import { printNode } from "@/features/pos/lib/print-node"
import { Receipt } from "@/features/pos/components/receipt"
import { RefundRequestDialog } from "@/features/refunds/components/refund-request-dialog"
import { formatFullDateTime } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { saleRefundState } from "../lib/sale-status"
import { SaleStatusBadges, StatusBadge } from "./sale-status-badges"

const Meta = ({ label, children }) => (
  <div>
    <dt className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">
      {label}
    </dt>
    <dd className="mt-0.5 text-sm">{children}</dd>
  </div>
)

const refundTone = {
  pending: "warning",
  approved: "destructive",
  rejected: "muted",
}

export const SaleDetailSheet = ({ saleId, user, onClose }) => {
  const [refunding, setRefunding] = useState(false)
  const receipt = useRef(null)
  const nameOf = useStaffName()
  const { data } = useQuery({ queryKey: ["sale", saleId], queryFn: ({ signal }) => getJson(`/api/sales/${encodeURIComponent(saleId)}`, { signal }) })
  if (!data) return null

  const { sale, refunds: saleRefunds } = data
  const canRefund = sale.items.some(({ variantId }) => refundableQuantity({ sales: [sale], refunds: saleRefunds }, sale.id, variantId) > 0)

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && !refunding && onClose()}>
        <SheetContent
          side="right"
          className="flex h-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        >
          <SheetHeader className="shrink-0 border-b p-4 pr-12 sm:p-6 sm:pr-14">
            <SheetTitle className="font-mono text-base tracking-normal normal-case">
              {sale.number}
            </SheetTitle>
            <SheetDescription>
              {formatFullDateTime(sale.soldAt)}
            </SheetDescription>
            <SaleStatusBadges
              sale={sale}
              refundState={saleRefundState(sale, saleRefunds)}
            />
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 [scrollbar-width:thin]">
            <dl className="grid grid-cols-2 gap-4">
              <Meta label="Cashier">{nameOf(sale.cashierId)}</Meta>
              <Meta label="Customer">{sale.customerName || "Walk-in"}</Meta>
              <Meta label="Phone">{sale.customerPhone || "—"}</Meta>
              <Meta label="Payment">
                {sale.payments.map(({ method, amount }) => `${method === "card" ? "Card" : "Cash"} ${formatMoney(amount)}`).join(" + ")}
              </Meta>
              <Meta label="Discount approved by">
                {sale.manualDiscountBy ? nameOf(sale.manualDiscountBy) : "—"}
              </Meta>
              <Meta label="Change given">{formatMoney(sale.change)}</Meta>
            </dl>

            <div className="space-y-2">
              <h3 className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">
                Items
              </h3>
              <ul className="divide-y border">
                {sale.items.map((item) => (
                  <li
                    key={item.variantId}
                    className="flex justify-between gap-3 p-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.attributes.color} · EU {item.attributes.size} ·{" "}
                        {item.quantity} × {formatMoney(item.unitPrice)}
                        {item.entry === "manual" && " · typed in"}
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      <p className="font-semibold">{formatMoney(item.total)}</p>
                      {item.productDiscount > 0 && <p className="text-xs text-muted-foreground">Offer −{formatMoney(item.productDiscount)}</p>}
                      {item.discount > 0 && <p className="text-xs text-muted-foreground">Discount −{formatMoney(item.discount)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="space-y-1 border bg-muted/50 px-3 py-2 text-sm tabular-nums">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(sale.subtotal)}</dd>
                </div>
                {sale.discountTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Discount</dt>
                    <dd>− {formatMoney(sale.discountTotal)}</dd>
                  </div>
                )}
                {sale.taxTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <dt>{sale.taxLabel || "Tax"} {sale.taxRate ? `(${sale.taxRate}%)` : ""}</dt>
                    <dd>{formatMoney(sale.taxTotal)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5">
                  <dt className="font-semibold tracking-label uppercase">Total</dt>
                  <dd className="font-sans text-lg font-bold text-gold">{formatMoney(sale.total)}</dd>
                </div>
                {sale.payments.map((payment, index) => (
                  <div key={`${payment.method}-${index}`} className="flex justify-between text-xs text-muted-foreground pt-1">
                    <dt>Paid · {payment.method === "card" ? "Card" : "Cash"}{payment.reference ? ` (${payment.reference})` : ""}</dt>
                    <dd>{formatMoney(payment.amount)}</dd>
                  </div>
                ))}
                {sale.change > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <dt>Change returned</dt>
                    <dd>{formatMoney(sale.change)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">
                Returns
              </h3>
              {saleRefunds.length ? (
                <ul className="divide-y border">
                  {saleRefunds.map((refund) => (
                    <li key={refund.id} className="space-y-1 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge tone={refundTone[refund.status]}>
                          {refund.status}
                        </StatusBadge>
                        <span className="font-semibold tabular-nums">
                          {formatMoney(refund.total)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {refund.reason} · asked by{" "}
                        {nameOf(refund.requestedBy)}
                        {refund.decidedBy &&
                          ` · ${refund.status} by ${nameOf(refund.decidedBy)}`}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No returns on this sale.
                </p>
              )}
            </div>

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <LockSimpleIcon className="size-3.5 text-gold" />
              Finished sales are locked. Corrections happen through returns, so
              every change is traceable.
            </p>
          </div>

          {user.role !== "admin" && (
            <SheetFooter className="shrink-0 border-t p-4 sm:p-6 flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => printNode(receipt.current, { paper: "receipt" })}
              >
                <PrinterIcon />
                Reprint
              </Button>
              <Button
                className="flex-1"
                disabled={!canRefund}
                onClick={() => setRefunding(true)}
              >
                <ArrowUUpLeftIcon />
                Request return
              </Button>
            </SheetFooter>
          )}

          <div className="hidden">
            <Receipt sale={sale} ref={receipt} />
          </div>
        </SheetContent>
      </Sheet>
      {refunding && (
        <RefundRequestDialog
          refunds={saleRefunds}
          sale={sale}
          user={user}
          onClose={() => setRefunding(false)}
        />
      )}
    </>
  )
}
