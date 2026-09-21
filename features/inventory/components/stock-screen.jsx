"use client"

import { useDeferredValue, useState } from "react"
import { MagnifyingGlassIcon, PackageIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination, paginate } from "@/components/ui/table-pagination"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { stockRows } from "../lib/stock-rows"
import { AdjustStockDialog } from "./adjust-stock-dialog"
import { ReceiveStockDialog } from "./receive-stock-dialog"

const filters = [
  { key: "all", label: "All" },
  { key: "low", label: "Low" },
  { key: "out", label: "Sold-out sizes" },
]

const SizeChips = ({ sizes, threshold }) => (
  <div className="flex">
    {sizes.map(({ variant, quantity }) => {
      const out = quantity <= 0
      const limit = threshold !== null && Number.isFinite(threshold) ? threshold : variant.lowStockAt
      const low = !out && quantity <= limit
      return (
        <div key={variant.id} title={`EU ${variant.attributes.size}: ${quantity} pairs`} className="flex w-8 flex-col items-center gap-1">
          <span className="text-[0.6rem] leading-none text-muted-foreground tabular-nums">{variant.attributes.size}</span>
          <span className={cn("text-sm leading-none tabular-nums", out && "text-destructive", low && "font-semibold text-warning")}>{out ? "–" : quantity}</span>
          <span className={cn("h-0.5 w-5", out ? "bg-destructive" : low ? "bg-warning" : "bg-border")} />
        </div>
      )
    })}
  </div>
)

export const StockScreen = ({ user }) => {
  const stock = useDemoStore(({ stock }) => stock)
  const settings = useDemoStore(({ settings }) => settings)
  const lowLimit = settings?.lowStockThreshold ?? 2
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [receiving, setReceiving] = useState(false)
  const [adjusting, setAdjusting] = useState(null)
  const search = useDeferredValue(query.trim().toLowerCase())
  const catalog = useCatalog()
  const scope = useShopScope(user)
  const rows = stockRows(stock, catalog, lowLimit).filter(({ product }) => scope === ALL_SHOPS || product.shopId === scope)
  const canEdit = user.role !== "admin"

  const visible = rows.filter(
    (row) =>
      (filter === "all" || (filter === "low" ? row.low > 0 : row.out > 0)) &&
      (!search ||
        `${row.product.name} ${row.product.brand} ${row.color}`.toLowerCase().includes(search) ||
        row.sizes.some(({ variant }) => variant.barcode === search || variant.sku.toLowerCase().includes(search)))
  )
  const pagination = paginate(visible, page)

  const withReset = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <InputGroup className="h-9 w-full sm:w-64 lg:w-72">
            <InputGroupAddon>
              <MagnifyingGlassIcon />
            </InputGroupAddon>
            <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} placeholder="Shoe, brand, SKU or barcode" />
          </InputGroup>
          <div className="overflow-x-auto pb-0.5 sm:pb-0 [scrollbar-width:none]">
            <Segmented options={filters} value={filter} onChange={withReset(setFilter)} />
          </div>
        </div>
        {canEdit && (
          <Button size="sm" className="w-full shrink-0 touch-manipulation sm:w-auto active:scale-95" onClick={() => setReceiving(true)}>
            <PackageIcon />
            Receive delivery
          </Button>
        )}
      </div>

      <div className="overflow-x-auto border bg-card [scrollbar-width:thin]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shoe</TableHead>
              <TableHead className="hidden md:table-cell">Stock by size (EU)</TableHead>
              <TableHead className="text-right">Pairs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.rows.map((row) => (
              <TableRow key={row.key} className={cn(canEdit && "cursor-pointer")} onClick={() => canEdit && setAdjusting(row)}>
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
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <SizeChips sizes={row.sizes} threshold={lowLimit} />
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{row.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!visible.length && <p className="py-12 text-center text-sm text-muted-foreground">Nothing matches.</p>}
        <TablePagination {...pagination} onPageChange={setPage} />
      </div>
      {canEdit && <p className="text-xs text-muted-foreground">Tap a shoe to fix its stock. Every change is saved with your name and a reason.</p>}

      {receiving && <ReceiveStockDialog user={user} onClose={() => setReceiving(false)} />}
      {adjusting && <AdjustStockDialog row={adjusting} user={user} onClose={() => setAdjusting(null)} />}
    </>
  )
}
