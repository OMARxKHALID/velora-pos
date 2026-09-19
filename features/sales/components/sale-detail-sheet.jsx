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
import { refundableQuantity } from "@/features/demo/lib/ledger"
import { staffName } from "@/features/demo/lib/staff"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { printNode } from "@/features/pos/lib/print-node"
import { Receipt } from "@/features/pos/components/receipt"
import { RefundRequestDialog } from "@/features/refunds/components/refund-request-dialog"
import { formatFullDateTime } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { saleRefundState } from "../lib/sale-status"
import { SaleStatusBadges, StatusBadge } from "./sale-status-badges"

const Meta = ({ label, children }) => (
  <div>
    <dt className="text-[0.6rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
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
  const sales = useDemoStore(({ sales }) => sales)
  const refunds = useDemoStore(({ refunds }) => refunds)
  const [refunding, setRefunding] = useState(false)
  const receipt = useRef(null)
  const sale = sales.find(({ id }) => id === saleId)
  const saleRefunds = refunds.filter((refund) => refund.saleId === saleId)
  const canRefund = sale.items.some(
    ({ variantId }) =>
      refundableQuantity({ sales, refunds }, sale.id, variantId) > 0
  )

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && !refunding && onClose()}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader className="border-b">
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

          <div className="space-y-6 p-4">
            <dl className="grid grid-cols-2 gap-4">
              <Meta label="Cashier">{staffName(sale.cashierId)}</Meta>
              <Meta label="Payment">
                {sale.payments
                  .map(
                    ({ method, amount }) => `${method} ${formatMoney(amount)}`
                  )
                  .join(" + ")}
              </Meta>
              <Meta label="Discount approved by">
                {sale.manualDiscountBy ? staffName(sale.manualDiscountBy) : "—"}
              </Meta>
              <Meta label="Change given">{formatMoney(sale.change)}</Meta>
            </dl>

            <div className="space-y-2">
              <h3 className="text-[0.65rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
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
                      {item.discount > 0 && (
                        <p className="text-xs text-muted-foreground">
                          −{formatMoney(item.discount)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border bg-muted/50 px-3 py-2 text-sm">
                <span className="font-semibold tracking-[0.2em] uppercase">
                  Total
                </span>
                <span className="font-heading text-lg font-bold text-gold">
                  {formatMoney(sale.total)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[0.65rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                Refunds
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
                        {staffName(refund.requestedBy)}
                        {refund.decidedBy &&
                          ` · ${refund.status} by ${staffName(refund.decidedBy)}`}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No refunds on this sale.
                </p>
              )}
            </div>

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <LockSimpleIcon className="size-3.5 text-gold" />
              Finished sales are locked. Corrections happen through refunds, so
              every change is traceable.
            </p>
          </div>

          {user.role !== "admin" && (

          <SheetFooter className="mt-auto flex-row border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => printNode(receipt.current)}
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
              Request refund
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
          sale={sale}
          user={user}
          onClose={() => setRefunding(false)}
        />
      )}
    </>
  )
}
