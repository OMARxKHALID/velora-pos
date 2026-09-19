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
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2 text-success">
            <CheckCircleIcon className="size-6" weight="fill" />
            <span className="text-xs font-semibold tracking-[0.2em] uppercase">Sale complete</span>
          </div>
          <DialogTitle>{formatMoney(sale.total)}</DialogTitle>
          <DialogDescription>
            {sale.change > 0 ? `Give ${formatMoney(sale.change)} change.` : "No change due."} Receipt {sale.number}.
          </DialogDescription>
        </DialogHeader>
        <div className="border bg-muted/40 py-4">
          <Receipt sale={sale} ref={receipt} />
        </div>
        <DialogFooter className="gap-2">
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
