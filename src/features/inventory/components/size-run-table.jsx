"use client"

import { cn } from "cn"
import { DataTable } from "@/shared/components/ui/data-table"
import { PAGE_SIZE } from "@/shared/components/ui/table-pagination"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { sumBy } from "@/shared/lib/money"
import { compareSizes, sizeLabel } from "@/features/catalog/lib/catalog"

const heat = ["bg-transparent", "bg-primary/10", "bg-primary/25", "bg-primary/45", "bg-primary/70"]

const heatFor = (value, max) => heat[max > 0 && value > 0 ? Math.max(1, Math.ceil((value / max) * 4)) : 0]

const cellTone = ({ quantity, low, max }) => {
  if (quantity <= 0) return "bg-destructive/15 text-destructive"
  if (low) return "bg-warning/15 font-semibold text-warning"
  return heatFor(quantity, max)
}

const Swatch = ({ className, children }) => (
  <span className="flex items-center gap-1.5">
    <span className={cn("size-3 border", className)} />
    {children}
  </span>
)

const entryOf = (row, size) => row.sizes.find(({ variant }) => variant.attributes.size === size)

export const SizeRunTable = ({ rows, page, onPageChange }) => {
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)))
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
  const sizes = [...new Set(shown.flatMap((row) => row.sizes.map(({ variant }) => variant.attributes.size)))].toSorted(compareSizes)
  const max = Math.max(0, ...rows.flatMap((row) => row.sizes.map(({ quantity }) => quantity)))

  const columns = [
    {
      id: "product",
      header: "Product",
      footer: "On hand on this page",
      meta: { className: "sticky left-0 z-10", headerClassName: "min-w-44 bg-card", cellClassName: "bg-card", footerClassName: "bg-muted text-xs font-medium" },
      cell: ({ row: { original: row } }) => (
        <div className="flex items-center gap-2.5">
          <ColorDot color={row.color} />
          <div className="min-w-0">
            <p className="max-w-48 truncate text-sm font-medium">{row.product.name}</p>
            <p className="text-xs text-muted-foreground">{row.color}</p>
          </div>
        </div>
      ),
    },
    ...sizes.map((size) => ({
      id: `size-${size}`,
      header: size,
      footer: ({ table }) => sumBy(table.getRowModel().rows, ({ original }) => entryOf(original, size)?.quantity ?? 0),
      meta: { headerClassName: "w-12 px-1 text-center @lg:px-1", cellClassName: "p-0.5", footerClassName: "text-center text-sm font-semibold tabular-nums" },
      cell: ({ row: { original: row } }) => {
        const entry = entryOf(row, size)
        if (!entry) return <span className="block h-9 bg-muted/30" />
        const low = entry.quantity > 0 && entry.quantity <= row.limit
        return (
          <span title={`${sizeLabel(size)}: ${entry.quantity} on hand`} className={cn("flex h-9 items-center justify-center text-sm tabular-nums", cellTone({ quantity: entry.quantity, low, max }))}>
            {entry.quantity > 0 ? entry.quantity : "–"}
          </span>
        )
      },
    })),
  ]

  return (
    <div className="space-y-3">
      <DataTable columns={columns} data={rows} getRowId={({ key }) => key} empty="Nothing matches." page={page} onPageChange={onPageChange} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 text-xs text-muted-foreground">
        <Swatch className="bg-destructive/15">Out</Swatch>
        <Swatch className="bg-warning/15">Low</Swatch>
        <Swatch className="bg-primary/70">Most in stock</Swatch>
      </div>
    </div>
  )
}
