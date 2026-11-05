"use client"

import { useDeferredValue, useMemo, useState } from "react"
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
  SquaresFourIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/components/ui/input-group"
import { useUrlState } from "@/shared/hooks/use-url-state"
import { Segmented } from "@/shared/components/ui/segmented"
import { DataTable } from "@/shared/components/ui/data-table"
import { resetsPage } from "@/shared/components/ui/table-pagination"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { StatusBadge } from "@/features/sales/components/sale-status-badges"
import { downloadFile } from "@/shared/lib/download"
import { formatMoney, sumBy } from "@/shared/lib/money"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { useCatalog } from "../hooks/use-catalog"
import { exportCatalogCsv } from "../lib/catalog-csv"
import { CategoriesDialog } from "./categories-dialog"
import { ImportCatalogDialog } from "./import-catalog-dialog"
import { LabelsDialog } from "./labels-dialog"
import { ProductFormDialog } from "./product-form-dialog"
import { Surface } from "@/shared/components/ui/surface"

const statuses = [
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
]

const sizeRange = (sizes) => (sizes.length > 1 ? `${sizes[0]}–${sizes.at(-1)}` : sizes[0])

const DeleteDialog = ({ product, busy, onConfirm, onClose }) => (
  <AlertDialog open onOpenChange={(open) => !open && !busy && onClose()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete product?</AlertDialogTitle>
        <AlertDialogDescription>{product.name} has never been stocked or sold, so it can be removed completely. This cannot be undone.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
        <Button variant="destructive" pending={busy} onClick={onConfirm}>
          Delete
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

export const ProductsScreen = ({ user }) => {
  const stock = useLedgerStore(({ stock }) => stock)
  const usedVariantIds = useLedgerStore(({ usedVariantIds }) => usedVariantIds)
  const setProductStatus = useLedgerStore(({ setProductStatus }) => setProductStatus)
  const deleteProduct = useLedgerStore(({ deleteProduct }) => deleteProduct)
  const { products: allProducts, variants, variantsByProduct } = useCatalog()
  const scope = useShopScope(user)
  const products = allProducts.filter((product) => scope === ALL_SHOPS || product.shopId === scope)
  const [status, setStatus] = useUrlState("status", "active", statuses.map(({ key }) => key))
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [importing, setImporting] = useState(false)
  const [managingCategories, setManagingCategories] = useState(false)
  const [labelling, setLabelling] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const search = useDeferredValue(query.trim().toLowerCase())
  const usedVariants = useMemo(() => new Set(usedVariantIds ?? []), [usedVariantIds])
  const canDelete = (product) => !(variantsByProduct[product.id] ?? []).some(({ id }) => usedVariants.has(id))

  const visible = products
    .filter((product) => (status === "all" || product.status === status) && (!search || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(search)))
    .toReversed()

  const pairsOf = (product) => sumBy((variantsByProduct[product.id] ?? []).filter(({ active: on }) => on), ({ id }) => Math.max(stock[id] ?? 0, 0))

  const withReset = resetsPage(setPage)

  const columns = [
    {
      id: "product",
      header: "Product",
      meta: { cellClassName: "w-full max-w-0 whitespace-normal @lg:w-auto @lg:max-w-64 @lg:whitespace-nowrap" },
      cell: ({ row: { original: product } }) => (
        <>
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{product.name}</p>
            {product.status === "archived" && <StatusBadge>Archived</StatusBadge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {product.brand} · {product.colors.length} {product.colors.length === 1 ? "colour" : "colours"} · sizes {sizeRange(product.sizes)}
          </p>
        </>
      ),
    },
    { id: "price", header: "Price", meta: { className: "text-right", cellClassName: "text-sm font-semibold tabular-nums" }, cell: ({ row }) => formatMoney(row.original.price) },
    { id: "stock", header: "In stock", meta: { className: "hidden text-right @lg:table-cell", cellClassName: "text-sm tabular-nums" }, cell: ({ row }) => pairsOf(row.original) },
    {
      id: "actions",
      header: "",
      meta: { headerClassName: "w-10" },
      cell: ({ row: { original: product } }) => (
        <div onClick={(event) => event.stopPropagation()}>
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
              {canDelete(product) && (
                <DropdownMenuItem variant="destructive" onClick={() => setDeleting(product)}>
                  <TrashIcon />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]


  const handleClearFilters = () => {
    setQuery("")
    setStatus("active")
    setPage(1)
  }

  const handleExport = () => {
    downloadFile(`velora-products-${new Date().toISOString().slice(0, 10)}.csv`, exportCatalogCsv({ products, variants, stock }))
    toast.success("Export ready", { description: `${variants.length} rows with stock, prices and barcodes.` })
  }

  const handleStatus = async (product, next) => {
    try {
      await setProductStatus({ productId: product.id, status: next })
      toast.success(next === "archived" ? "Archived" : "Restored", {
        description: next === "archived" ? `${product.name} is hidden from the POS. History is kept.` : `${product.name} is back on sale.`,
      })
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDelete = async () => {
    if (deletingBusy) return
    setDeletingBusy(true)
    try {
      await deleteProduct({ productId: deleting.id })
      toast.success("Deleted", { description: deleting.name })
    } catch (error) {
      toast.error(error.message)
    }
    setDeletingBusy(false)
    setDeleting(null)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <InputGroup className="w-full @xl:w-72">
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} aria-label="Search products" placeholder="Name, brand or category…" />
        </InputGroup>
        <Segmented label="Status" options={statuses} value={status} onChange={withReset(setStatus)} />
        <div className="flex w-full items-center gap-2 @2xl:ml-auto @2xl:w-auto">
          <Button size="sm" variant="outline" aria-label="Categories" onClick={() => setManagingCategories(true)}>
            <SquaresFourIcon />
            <span className="hidden @lg:inline">Categories</span>
          </Button>
          <Button size="sm" variant="outline" aria-label="Import products" onClick={() => setImporting(true)}>
            <UploadSimpleIcon />
            <span className="hidden @lg:inline">Import</span>
          </Button>
          <Button size="sm" variant="outline" aria-label="Export products" onClick={handleExport}>
            <DownloadSimpleIcon />
            <span className="hidden @lg:inline">Export</span>
          </Button>
          <Button size="sm" className="flex-1 @2xl:flex-initial" onClick={() => setEditing("new")}>
            <PlusIcon />
            Add product
          </Button>
        </div>
      </div>

      <Surface>
        <DataTable columns={columns} data={visible} getRowId={({ id }) => id} onRowClick={setEditing} empty="No products here." emptyAction={query || status !== "active" ? { label: "Clear filters", onClick: handleClearFilters } : null} page={page} onPageChange={setPage} />
      </Surface>
      <p className="text-xs text-muted-foreground">Products that were ever sold can be archived but not deleted, so old receipts stay correct.</p>

      {editing && <ProductFormDialog product={editing === "new" ? null : editing} user={user} onClose={() => setEditing(null)} />}
      {managingCategories && <CategoriesDialog onClose={() => setManagingCategories(false)} />}
      {importing && <ImportCatalogDialog onClose={() => setImporting(false)} />}
      {labelling && <LabelsDialog product={labelling} onClose={() => setLabelling(null)} />}
      {deleting && <DeleteDialog product={deleting} busy={deletingBusy} onConfirm={handleDelete} onClose={() => setDeleting(null)} />}
    </>
  )
}
