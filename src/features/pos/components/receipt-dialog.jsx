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

export const ReceiptDialog = ({ sale, register = null, onClose }) => {
  const receipt = useRef(null)
  const design = receiptDesign({ receipt: useSettingsFor(sale.shopId).receipt })
  const copies = register?.copies ?? 1

  const handlePrint = () => printNode(receipt.current, { paper: receiptPaper(design), copies })

  const printOnOpen = useEffectEvent(() => {
    if (register?.autoPrint) handlePrint()
  })

  useEffect(() => {
    const timer = setTimeout(printOnOpen, 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent flush className="sm:max-w-md">
        <DialogHeader className="shrink-0 p-4 pr-14 pb-3 sm:p-6 sm:pr-16 sm:pb-4">
          <div className="mb-2 flex items-center gap-2 text-success">
            <CheckCircleIcon className="size-6" weight="fill" />
            <span className="text-xs font-semibold tracking-label uppercase">Sale complete</span>
          </div>
          <DialogTitle>{formatMoney(sale.total + (sale.cashRounding ?? 0))}</DialogTitle>
          <DialogDescription>
            {sale.change > 0 ? `Give ${formatMoney(sale.change)} change.` : "No change due."} Receipt {sale.number}.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto border-y bg-muted/40 py-4 [scrollbar-width:thin]">
          <Receipt sale={sale} ref={receipt} />
        </div>
        <DialogFooter className="shrink-0 p-4 pt-3 sm:p-6 sm:pt-4">
          <Button variant="outline" onClick={handlePrint}>
            <PrinterIcon />
            {copies > 1 ? `Print ${copies} copies` : "Print receipt"}
          </Button>
          <Button onClick={onClose}>New sale</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
