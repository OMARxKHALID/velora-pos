"use client"

import { useDeferredValue, useState } from "react"
import { toast } from "sonner"
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  BarcodeIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination, paginate } from "@/components/ui/table-pagination"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { StatusBadge } from "@/features/sales/components/sale-status-badges"
import { downloadFile } from "@/lib/download"
import { formatMoney, sumBy } from "@/lib/money"
import { useCatalog } from "../hooks/use-catalog"
import { exportCatalogCsv } from "../lib/catalog-csv"
import { canDeleteProduct } from "../lib/catalog-ledger"
import { ImportCatalogDialog } from "./import-catalog-dialog"
import { LabelsDialog } from "./labels-dialog"
import { ProductFormDialog } from "./product-form-dialog"

const statuses = [
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
]

const sizeRange = (sizes) => (sizes.length > 1 ? `${sizes[0]}–${sizes.at(-1)}` : sizes[0])

const DeleteDialog = ({ product, onConfirm, onClose }) => (
  <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete product?</DialogTitle>
        <DialogDescription>{product.name} has never been stocked or sold, so it can be removed completely. This cannot be undone.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Keep it
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export const ProductsScreen = ({ user }) => {
  const state = useDemoStore((store) => store)
  const setProductStatus = useDemoStore(({ setProductStatus }) => setProductStatus)
  const deleteProduct = useDemoStore(({ deleteProduct }) => deleteProduct)
  const { products, variants, variantsByProduct } = useCatalog()
  const [status, setStatus] = useState("active")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [importing, setImporting] = useState(false)
  const [labelling, setLabelling] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const search = useDeferredValue(query.trim().toLowerCase())

  const active = products.filter((product) => product.status === "active")
  const visible = products
    .filter((product) => (status === "all" || product.status === status) && (!search || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(search)))
    .toReversed()
  const pagination = paginate(visible, page)

  const pairsOf = (product) => sumBy((variantsByProduct[product.id] ?? []).filter(({ active: on }) => on), ({ id }) => Math.max(state.stock[id] ?? 0, 0))

  const withReset = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const handleExport = () => {
    downloadFile(`velora-products-${new Date().toISOString().slice(0, 10)}.csv`, exportCatalogCsv(state))
    toast.success("Export ready", { description: `${variants.length} rows with stock, prices and barcodes.` })
  }

  const handleStatus = (product, next) => {
    setProductStatus({ productId: product.id, status: next })
    toast.success(next === "archived" ? "Archived" : "Restored", {
      description: next === "archived" ? `${product.name} is hidden from the POS. History is kept.` : `${product.name} is back on sale.`,
    })
  }

  const handleDelete = () => {
    try {
      deleteProduct({ productId: deleting.id })
      toast.success("Deleted", { description: deleting.name })
    } catch (error) {
      toast.error(error.message)
    }
    setDeleting(null)
  }

  return (
    <>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <InputGroup className="h-9 w-full sm:w-64 lg:w-72">
            <InputGroupAddon>
              <MagnifyingGlassIcon />
            </InputGroupAddon>
            <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} placeholder="Name, brand or category" />
          </InputGroup>
          <div className="overflow-x-auto pb-0.5 sm:pb-0 [scrollbar-width:none]">
            <Segmented options={statuses} value={status} onChange={withReset(setStatus)} />
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Button size="sm" variant="outline" className="touch-manipulation active:scale-95" onClick={() => setImporting(true)}>
            <UploadSimpleIcon />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button size="sm" variant="outline" className="touch-manipulation active:scale-95" onClick={handleExport}>
            <DownloadSimpleIcon />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" className="flex-1 touch-manipulation sm:flex-initial active:scale-95" onClick={() => setEditing("new")}>
            <PlusIcon />
            Add product
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border bg-card [scrollbar-width:thin]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Pairs</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.rows.map((product) => (
              <TableRow key={product.id} className="cursor-pointer" onClick={() => setEditing(product)}>
                <TableCell className="max-w-64">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    {product.status === "archived" && <StatusBadge>Archived</StatusBadge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {product.brand} · {product.colors.length} {product.colors.length === 1 ? "colour" : "colours"} · sizes {sizeRange(product.sizes)}
                  </p>
                </TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">{formatMoney(product.price)}</TableCell>
                <TableCell className="hidden text-right text-sm tabular-nums sm:table-cell">{pairsOf(product)}</TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`Actions for ${product.name}`} />}>
                      <DotsThreeIcon className="size-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                      <DropdownMenuItem onClick={() => setEditing(product)}>
                        <PencilSimpleIcon />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLabelling(product)}>
                        <BarcodeIcon />
                        Print labels
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {product.status === "active" ? (
                        <DropdownMenuItem onClick={() => handleStatus(product, "archived")}>
                          <ArchiveIcon />
                          Archive
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleStatus(product, "active")}>
                          <ArrowCounterClockwiseIcon />
                          Restore
                        </DropdownMenuItem>
                      )}
                      {canDeleteProduct(state, product.id) && (
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(product)}>
                          <TrashIcon />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!visible.length && <p className="py-12 text-center text-sm text-muted-foreground">No products here.</p>}
        <TablePagination {...pagination} onPageChange={setPage} />
      </div>
      <p className="text-xs text-muted-foreground">Shoes that were ever sold can be archived but not deleted, so old receipts stay correct.</p>

      {editing && <ProductFormDialog product={editing === "new" ? null : editing} user={user} onClose={() => setEditing(null)} />}
      {importing && <ImportCatalogDialog user={user} onClose={() => setImporting(false)} />}
      {labelling && <LabelsDialog product={labelling} onClose={() => setLabelling(null)} />}
      {deleting && <DeleteDialog product={deleting} onConfirm={handleDelete} onClose={() => setDeleting(null)} />}
    </>
  )
}
