"use client"

import { useDeferredValue, useState } from "react"
import { MagnifyingGlassIcon, PackageIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { StatStrip } from "@/components/ui/stat-strip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination, paginate } from "@/components/ui/table-pagination"
import { colorSwatches } from "@/features/catalog/lib/catalog"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { formatMoney, sumBy } from "@/lib/money"
import { stockRows } from "../lib/stock-rows"
import { AdjustStockDialog } from "./adjust-stock-dialog"
import { ReceiveStockDialog } from "./receive-stock-dialog"

const filters = [
  { key: "all", label: "All" },
  { key: "low", label: "Low" },
  { key: "out", label: "Sold-out sizes" },
]

const SizeChips = ({ sizes }) => (
  <div className="flex">
    {sizes.map(({ variant, quantity }) => {
      const out = quantity <= 0
      const low = !out && quantity <= variant.lowStockAt
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
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [receiving, setReceiving] = useState(false)
  const [adjusting, setAdjusting] = useState(null)
  const search = useDeferredValue(query.trim().toLowerCase())
  const catalog = useCatalog()
  const rows = stockRows(stock, catalog)

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
      <StatStrip
        stats={[
          { label: "Pairs in stock", value: sumBy(rows, ({ total }) => total).toLocaleString("en-PK") },
          { label: "Stock value (cost)", value: formatMoney(sumBy(rows, ({ value }) => value)) },
          { label: "Low sizes", value: sumBy(rows, ({ low }) => low), tone: "warning" },
          { label: "Sold-out sizes", value: sumBy(rows, ({ out }) => out), tone: "destructive" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="h-9 w-full sm:w-72">
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} placeholder="Shoe, brand, SKU or barcode" />
        </InputGroup>
        <Segmented options={filters} value={filter} onChange={withReset(setFilter)} />
        <Button size="sm" className="ml-auto" onClick={() => setReceiving(true)}>
          <PackageIcon />
          Receive delivery
        </Button>
      </div>

      <div className="border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shoe</TableHead>
              <TableHead className="hidden md:table-cell">Stock by size (EU)</TableHead>
              <TableHead className="text-right">Pairs</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.rows.map((row) => (
              <TableRow key={row.key} className="cursor-pointer" onClick={() => setAdjusting(row)}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="size-3 shrink-0 rounded-full border border-foreground/20" style={{ backgroundColor: colorSwatches[row.color] }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.product.brand} · {row.color}
                        {row.low > 0 && <span className="text-warning"> · {row.low} low</span>}
                        {row.out > 0 && <span className="text-destructive"> · {row.out} out</span>}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <SizeChips sizes={row.sizes} />
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{row.total}</TableCell>
                <TableCell className="hidden text-right text-sm text-muted-foreground tabular-nums sm:table-cell">{formatMoney(row.value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!visible.length && <p className="py-12 text-center text-sm text-muted-foreground">Nothing matches.</p>}
        <TablePagination {...pagination} onPageChange={setPage} />
      </div>
      <p className="text-xs text-muted-foreground">Tap a row to correct stock. Stock never changes silently: every change is a movement with a name and reason.</p>

      {receiving && <ReceiveStockDialog user={user} onClose={() => setReceiving(false)} />}
      {adjusting && <AdjustStockDialog row={adjusting} user={user} onClose={() => setAdjusting(null)} />}
    </>
  )
}
