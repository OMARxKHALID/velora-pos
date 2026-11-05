"use client"

import { useEffect, useEffectEvent, useRef } from "react"
import { CheckCircleIcon, PrinterIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { formatMoney } from "@/shared/lib/money"
import { printNode } from "../lib/print-node"
import { receiptDesign, receiptPaper } from "../lib/receipt-design"
import { Receipt } from "./receipt"
import { useSettingsFor } from "@/features/shops/hooks/use-shop-scope"

export const ReceiptDialog = ({ sale, register = null, viewOnly = false, onClose }) => {
  const receipt = useRef(null)
  const done = useRef(null)
  const design = receiptDesign({ receipt: useSettingsFor(sale.shopId).receipt })
  const copies = register?.copies ?? 1

  const handlePrint = () => printNode(receipt.current, { paper: receiptPaper(design), copies })

  const printOnOpen = useEffectEvent(() => {
    if (register?.autoPrint && !viewOnly) handlePrint()
  })

  useEffect(() => {
    const timer = setTimeout(printOnOpen, 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent flush instant initialFocus={done} data-scan-through={viewOnly ? undefined : ""} className="sm:max-w-md">
        <DialogHeader className="shrink-0 p-4 pr-14 pb-3 sm:p-6 sm:pr-16 sm:pb-4">
          {!viewOnly && (
            <div className="mb-2 flex items-center gap-2 text-success">
              <CheckCircleIcon className="size-6" weight="fill" />
              <span className="text-xs font-semibold tracking-label uppercase">Sale complete</span>
            </div>
          )}
          <DialogTitle>{viewOnly ? `Receipt ${sale.number}` : formatMoney(sale.total + (sale.cashRounding ?? 0))}</DialogTitle>
          {!viewOnly && sale.change > 0 && <p className="font-sans text-3xl font-bold text-gold tabular-nums">Give {formatMoney(sale.change)} change</p>}
          <DialogDescription>{viewOnly ? `${formatMoney(sale.total + (sale.cashRounding ?? 0))}. Saved on this till, not uploaded yet.` : `${sale.change > 0 ? "" : "No change due. "}Receipt ${sale.number}. Scan the next item to start a new sale.`}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto border-y bg-muted/40 py-4 [scrollbar-width:thin]">
          <Receipt sale={sale} ref={receipt} />
        </div>
        <DialogFooter className="shrink-0 p-4 pt-3 sm:p-6 sm:pt-4">
          <Button variant="outline" onClick={handlePrint}>
            <PrinterIcon />
            {copies > 1 ? `Print ${copies} copies` : "Print receipt"}
          </Button>
          <Button ref={done} onClick={onClose}>
            {viewOnly ? "Close" : "New sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
