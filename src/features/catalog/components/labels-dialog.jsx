"use client"

import { useEffect, useRef, useState } from "react"
import JsBarcode from "jsbarcode"
import { PrinterIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Segmented } from "@/shared/components/ui/segmented"
import { isValidEan13 } from "@/features/catalog/lib/barcode"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { printNode } from "@/features/pos/lib/print-node"
import { formatMoney } from "@/shared/lib/money"
import { useCatalog } from "../hooks/use-catalog"
import { sizeLabel } from "../lib/catalog"

const Label = ({ product, variant }) => {
  const svg = useRef(null)

  useEffect(() => {
    JsBarcode(svg.current, variant.barcode, { format: isValidEan13(variant.barcode) ? "EAN13" : "CODE128", height: 34, width: 1.3, fontSize: 10, margin: 0 })
  }, [variant.barcode])

  return (
    <div className="flex w-[190px] flex-col items-center gap-0.5 border border-dashed border-black/30 bg-white p-2 text-center text-2xs leading-tight text-black">
      <span className="w-full truncate font-bold">{product.name}</span>
      <span>
        {variant.attributes.color} · {sizeLabel(variant.attributes.size)} · <b>{formatMoney(variant.price)}</b>
      </span>
      <svg ref={svg} />
    </div>
  )
}

export const LabelsDialog = ({ product, onClose }) => {
  const stock = useLedgerStore(({ stock }) => stock)
  const { variantsByProduct } = useCatalog()
  const [mode, setMode] = useState("size")
  const sheet = useRef(null)
  const active = variantsByProduct[product.id].filter(({ active }) => active)
  const labels = active.flatMap((variant) => Array.from({ length: mode === "size" ? 1 : Math.max(stock[variant.id] ?? 0, 0) }, (_, index) => ({ variant, key: `${variant.id}-${index}` })))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Barcode labels</DialogTitle>
          <DialogDescription>{product.name}. Stick one on each box that came without a barcode.</DialogDescription>
        </DialogHeader>
        <Segmented
          options={[
            { key: "size", label: "One per size" },
            { key: "stock", label: "One per item in stock" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <div className="max-h-[50dvh] overflow-y-auto border bg-muted/40 p-3">
          <div ref={sheet} className="flex flex-wrap gap-2 bg-white p-2">
            {labels.map(({ variant, key }) => (
              <Label key={key} product={product} variant={variant} />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button disabled={!labels.length} onClick={() => printNode(sheet.current)}>
            <PrinterIcon />
            Print {labels.length} labels
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
