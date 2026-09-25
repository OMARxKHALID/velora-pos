"use client"

import { useDeferredValue, useMemo, useState } from "react"
import Link from "next/link"
import { BarcodeIcon, MagnifyingGlassIcon, PackageIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button, buttonVariants } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination, paginate, resetsPage } from "@/components/ui/table-pagination"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { useLowLimitOf, useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { DAY, startOfToday } from "@/lib/dates"
import { stockRows } from "../lib/stock-rows"
import { AdjustStockDialog } from "./adjust-stock-dialog"
import { ReceiveStockDialog } from "./receive-stock-dialog"
import { SizeRunTable } from "./size-run-table"
import { sizeLabel } from "@/features/catalog/lib/catalog"

const filters = [
  { key: "all", label: "All" },
  { key: "low", label: "Low" },
  { key: "out", label: "Sold-out sizes" },
]

const views = [
  { key: "list", label: "List" },
  { key: "on-hand", label: "Size run" },
  { key: "sold", label: "Sold · 30 days" },
]

const soldSince = (sales, from) => {
  const sold = {}
  for (const { soldAt, items } of sales) {
    if (soldAt < from) continue
    for (const { variantId, quantity } of items) sold[variantId] = (sold[variantId] ?? 0) + quantity
  }
  return sold
}

const SizeChips = ({ sizes, threshold }) => (
  <div className="flex">
    {sizes.map(({ variant, quantity }) => {
      const out = quantity <= 0
      const low = !out && quantity <= (Number.isFinite(threshold) ? threshold : variant.lowStockAt)
      return (
        <div key={variant.id} title={`${sizeLabel(variant.attributes.size)}: ${quantity} in stock`} className="flex min-w-8 flex-col items-center gap-1 px-0.5">
          <span className="text-2xs leading-none text-muted-foreground tabular-nums">{variant.attributes.size}</span>
          <span className={cn("text-sm leading-none tabular-nums", out && "text-destructive", low && "font-semibold text-warning")}>{out ? "–" : quantity}</span>
          <span className={cn("h-0.5 w-5", out ? "bg-destructive" : low ? "bg-warning" : "bg-border")} />
        </div>
      )
    })}
  </div>
)

export const StockScreen = ({ user }) => {
  const stock = useDemoStore(({ stock }) => stock)
  const sales = useDemoStore(({ sales }) => sales)
  const categories = useDemoStore(({ categories }) => categories)
  const [view, setView] = useState("list")
  const sold = useMemo(() => (view === "sold" ? soldSince(sales, startOfToday() - 29 * DAY) : {}), [sales, view])
  const lowLimit = useLowLimitOf()
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [receiving, setReceiving] = useState(false)
  const [adjusting, setAdjusting] = useState(null)
  const search = useDeferredValue(query.trim().toLowerCase())
  const catalog = useCatalog()
  const scope = useShopScope(user)
  const rows = stockRows(stock, catalog, lowLimit, categories).filter(({ product }) => scope === ALL_SHOPS || product.shopId === scope)
  const canEdit = user.role !== "admin"

  const visible = rows.filter(
    (row) =>
      (filter === "all" || (filter === "low" ? row.low > 0 : row.out > 0)) &&
      (!search ||
        `${row.product.name} ${row.product.brand} ${row.color}`.toLowerCase().includes(search) ||
        row.sizes.some(({ variant }) => variant.barcode === search || variant.sku.toLowerCase().includes(search)))
  )
  const pagination = paginate(visible, page)

  const withReset = resetsPage(setPage)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <InputGroup className="w-full @xl:w-72">
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} placeholder="Product, brand, SKU or barcode" />
        </InputGroup>
        <Segmented label="Stock level" options={filters} value={filter} onChange={withReset(setFilter)} />
        <Segmented label="View" options={views} value={view} onChange={setView} />
        {canEdit && (
          <div className="flex w-full gap-2 @2xl:ml-auto @2xl:w-auto">
            <Link href="/stock/count" className={buttonVariants({ size: "sm", variant: "outline", className: "flex-1 @2xl:flex-none" })}>
              <BarcodeIcon />
              Count stock
            </Link>
            <Button size="sm" className="flex-1 @2xl:flex-none" onClick={() => setReceiving(true)}>
              <PackageIcon />
              Receive delivery
            </Button>
          </div>
        )}
      </div>

      <div className="border bg-card">
        {view !== "list" ? (
          <SizeRunTable rows={pagination.rows} scaleFrom={visible} metric={view === "sold" ? "sold" : "on-hand"} sold={sold} />
        ) : (
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="hidden @2xl:table-cell">Stock by size</TableHead>
              <TableHead className="text-right">In stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.rows.map((row) => (
              <TableRow key={row.key} onClick={canEdit ? () => setAdjusting(row) : undefined}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <ColorDot color={row.color} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.color}
                        {row.low > 0 && <span className="text-warning"> · {row.low} low</span>}
                        {row.out > 0 && <span className="text-destructive"> · {row.out} out</span>}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 max-w-[calc(100cqw-6rem)] overflow-x-auto pb-1 @2xl:hidden">
                    <SizeChips sizes={row.sizes} threshold={row.limit} />
                  </div>
                </TableCell>
                <TableCell className="hidden @2xl:table-cell">
                  <SizeChips sizes={row.sizes} threshold={row.limit} />
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{row.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        )}
        {!visible.length && <p className="py-12 text-center text-sm text-muted-foreground">Nothing matches.</p>}
        <TablePagination {...pagination} onPageChange={setPage} />
      </div>
      {canEdit && <p className="text-xs text-muted-foreground">Tap a product to fix its stock. Every change is saved with your name and a reason.</p>}

      {receiving && <ReceiveStockDialog user={user} onClose={() => setReceiving(false)} />}
      {adjusting && <AdjustStockDialog row={adjusting} user={user} onClose={() => setAdjusting(null)} />}
    </>
  )
}
