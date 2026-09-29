"use client"

import { useState } from "react"
import { toast } from "sonner"
import { DownloadSimpleIcon, FileCsvIcon, WarningIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { DataTable } from "@/shared/components/ui/data-table"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { downloadFile } from "@/shared/lib/download"
import { formatMoney } from "@/shared/lib/money"
import { importTemplateCsv, parseCatalogImport } from "../lib/catalog-csv"
import { ColorDot } from "./color-dot"
import { sizeLabel } from "../lib/catalog"

const previewColumns = [
  {
    id: "product",
    header: "Product",
    meta: { cellClassName: "max-w-48 truncate text-sm" },
    cell: ({ row: { original } }) => (
      <>
        {original.product} <span className="text-muted-foreground">· {original.brand}</span>
      </>
    ),
  },
  {
    id: "variant",
    header: "Colour / size",
    meta: { cellClassName: "text-sm" },
    cell: ({ row: { original } }) => (
      <span className="flex items-center gap-1.5">
        <ColorDot color={original.color} className="size-3.5" />
        {original.color} · {sizeLabel(original.size)}
      </span>
    ),
  },
  { id: "price", header: "Price", meta: { className: "text-right", cellClassName: "text-sm tabular-nums" }, cell: ({ row }) => formatMoney(row.original.price) },
  { id: "stock", header: "Receive", meta: { className: "hidden text-right @lg:table-cell", cellClassName: "text-sm tabular-nums" }, cell: ({ row }) => row.original.stock },
]

export const ImportCatalogDialog = ({ onClose }) => {
  const importCatalog = useLedgerStore(({ importCatalog }) => importCatalog)
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)

  const handleFile = async (event) => {
    const picked = event.target.files?.[0]
    if (!picked) return
    setFile(picked.name)
    setResult(parseCatalogImport(await picked.text()))
  }

  const handleApply = async () => {
    try {
      const { created, updated, pairs } = await importCatalog({ rows: result.rows })
      toast.success("Import complete", { description: `${created} new, ${updated} updated${pairs ? `, ${pairs} pairs added to stock` : ""}.` })
      onClose()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const blocked = !result || !result.rows.length || result.errors.length > 0

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import products</DialogTitle>
          <DialogDescription>
            One row per colour and size. Existing products (same name and brand) get new sizes and prices; nothing is deleted. A “receive” column adds items to stock as a delivery; the exported “stock” column is ignored, so re-importing an export never doubles stock.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Label className="h-10 cursor-pointer border border-dashed px-4 font-normal transition-colors focus-within:border-primary hover:border-primary">
            <FileCsvIcon className="size-5 text-gold" />
            {file ?? "Choose a CSV file"}
            <Input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
          </Label>
          <Button variant="link" size="sm" onClick={() => downloadFile("velora-products-template.csv", importTemplateCsv())}>
            <DownloadSimpleIcon />
            Download template
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-semibold">{result.rows.length}</span> of {result.total} rows ready
              {result.errors.length > 0 && <span className="text-destructive"> · {result.errors.length} to fix</span>}
            </p>

            {result.errors.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                {result.errors.map(({ line, message }, index) => (
                  <li key={index} className="flex gap-2">
                    <WarningIcon className="mt-0.5 size-3.5 shrink-0" />
                    {line ? `Row ${line}: ` : ""}
                    {message}
                  </li>
                ))}
              </ul>
            )}

            {result.rows.length > 0 && (
              <div className="border">
                <DataTable columns={previewColumns} data={result.rows.slice(0, 5)} />
                {result.rows.length > 5 && <p className="border-t px-3 py-2 text-xs text-muted-foreground">+ {result.rows.length - 5} more rows</p>}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={blocked} onClick={handleApply}>
            Import {result?.rows.length || ""} rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
