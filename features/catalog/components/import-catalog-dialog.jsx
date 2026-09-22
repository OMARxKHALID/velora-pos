"use client"

import { useState } from "react"
import { toast } from "sonner"
import { DownloadSimpleIcon, FileCsvIcon, WarningIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { downloadFile } from "@/lib/download"
import { formatMoney } from "@/lib/money"
import { importTemplateCsv, parseCatalogImport } from "../lib/catalog-csv"
import { ColorDot } from "./color-dot"

export const ImportCatalogDialog = ({ user, onClose }) => {
  const importCatalog = useDemoStore(({ importCatalog }) => importCatalog)
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)

  const handleFile = async (event) => {
    const picked = event.target.files?.[0]
    if (!picked) return
    setFile(picked.name)
    setResult(parseCatalogImport(await picked.text()))
  }

  const handleApply = () => {
    try {
      const { created, updated, pairs } = importCatalog({ rows: result.rows, userId: user.id })
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
            One row per colour and size. Existing products (same name and brand) get new sizes and prices; nothing is deleted. A “receive” column adds pairs to stock as a delivery; the exported “stock” column is ignored, so re-importing an export never doubles stock.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-10 cursor-pointer items-center gap-2 border border-dashed px-4 text-sm transition-colors hover:border-primary">
            <FileCsvIcon className="size-5 text-gold" />
            {file ?? "Choose a CSV file"}
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
          </label>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Colour / size</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="hidden text-right @lg:table-cell">Receive</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="max-w-48 truncate text-sm">
                          {row.product} <span className="text-muted-foreground">· {row.brand}</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="flex items-center gap-1.5">
                            <ColorDot color={row.color} className="size-3.5" />
                            {row.color} · EU {row.size}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{formatMoney(row.price)}</TableCell>
                        <TableCell className="hidden text-right text-sm tabular-nums @lg:table-cell">{row.stock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
