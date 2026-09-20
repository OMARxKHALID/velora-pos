"use client"

import { useRef } from "react"
import { CheckCircleIcon, PrinterIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatMoney } from "@/lib/money"
import { printNode } from "../lib/print-node"
import { Receipt } from "./receipt"

export const ReceiptDialog = ({ sale, onClose }) => {
  const receipt = useRef(null)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 p-5 pb-3 sm:p-6 sm:pb-4">
          <div className="mb-2 flex items-center gap-2 text-success">
            <CheckCircleIcon className="size-6" weight="fill" />
            <span className="text-xs font-semibold tracking-[0.2em] uppercase">Sale complete</span>
          </div>
          <DialogTitle>{formatMoney(sale.total)}</DialogTitle>
          <DialogDescription>
            {sale.change > 0 ? `Give ${formatMoney(sale.change)} change.` : "No change due."} Receipt {sale.number}.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto border-y bg-muted/40 py-4 [scrollbar-width:thin]">
          <Receipt sale={sale} ref={receipt} />
        </div>
        <DialogFooter className="shrink-0 gap-2 p-5 pt-3 sm:p-6 sm:pt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => printNode(receipt.current)}>
            <PrinterIcon />
            Print receipt
          </Button>
          <Button onClick={onClose}>New sale</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
