"use client"

import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Spinner } from "@/shared/components/ui/spinner"

const loadReceiptDialog = () => import("./receipt-dialog").then((mod) => mod.ReceiptDialog)

export const preloadReceiptDialog = () => {
  loadReceiptDialog().catch(() => {})
}

const ReceiptDialogLoading = () => (
  <Dialog open>
    <DialogContent showCloseButton={false} className="sm:max-w-md">
      <DialogHeader className="items-center pr-0 text-center">
        <Spinner className="mb-2 size-6 text-gold" />
        <DialogTitle>Receipt</DialogTitle>
        <DialogDescription>Preparing the receipt…</DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
)

export const ReceiptDialog = dynamic(loadReceiptDialog, { loading: ReceiptDialogLoading })
