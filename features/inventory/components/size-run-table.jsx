"use client"

import { cn } from "cn"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { sumBy } from "@/lib/money"
import { compareSizes, sizeLabel } from "@/features/catalog/lib/catalog"

const heat = ["bg-transparent", "bg-primary/10", "bg-primary/25", "bg-primary/45", "bg-primary/70"]

const heatFor = (value, max) => heat[max > 0 && value > 0 ? Math.max(1, Math.ceil((value / max) * 4)) : 0]

const cellTone = ({ metric, quantity, sold, low, max }) => {
  if (metric === "sold") return cn(heatFor(sold, max), quantity <= 0 && "ring-2 ring-destructive/70 ring-inset")
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

export const SizeRunTable = ({ rows, scaleFrom, metric, sold }) => {
  const sizes = [...new Set(rows.flatMap((row) => row.sizes.map(({ variant }) => variant.attributes.size)))].toSorted(compareSizes)
  const valueOf = ({ variant, quantity }) => (metric === "sold" ? (sold[variant.id] ?? 0) : quantity)
  const max = Math.max(0, ...scaleFrom.flatMap((row) => row.sizes.map(valueOf)))
  const totalFor = (size) => sumBy(rows, (row) => sumBy(row.sizes.filter(({ variant }) => variant.attributes.size === size), valueOf))

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 min-w-44 bg-card">Product</TableHead>
              {sizes.map((size) => (
                <TableHead key={size} className="w-12 px-1 text-center @lg:px-1">
                  {size}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="sticky left-0 z-10 bg-card">
                  <div className="flex items-center gap-2.5">
                    <ColorDot color={row.color} />
                    <div className="min-w-0">
                      <p className="max-w-48 truncate text-sm font-medium">{row.product.name}</p>
                      <p className="text-xs text-muted-foreground">{row.color}</p>
                    </div>
                  </div>
                </TableCell>
                {sizes.map((size) => {
                  const entry = row.sizes.find(({ variant }) => variant.attributes.size === size)
                  if (!entry) return <TableCell key={size} className="bg-muted/30 p-0.5" />
                  const soldHere = sold[entry.variant.id] ?? 0
                  const low = entry.quantity > 0 && entry.quantity <= row.limit
                  return (
                    <TableCell key={size} className="p-0.5">
                      <span
                        title={`${sizeLabel(size)}: ${entry.quantity} on hand, ${soldHere} sold in 30 days`}
                        className={cn("flex h-9 items-center justify-center text-sm tabular-nums", cellTone({ metric, quantity: entry.quantity, sold: soldHere, low, max }))}
                      >
                        {metric === "sold" ? soldHere || "·" : entry.quantity > 0 ? entry.quantity : "–"}
                      </span>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="sticky left-0 z-10 bg-muted text-xs font-medium">{metric === "sold" ? "Sold on this page" : "On hand on this page"}</TableCell>
              {sizes.map((size) => (
                <TableCell key={size} className="text-center text-sm font-semibold tabular-nums">
                  {totalFor(size)}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 text-xs text-muted-foreground">
        {metric === "sold" ? (
          <>
            <Swatch className="bg-primary/10">Few sold</Swatch>
            <Swatch className="bg-primary/70">Many sold</Swatch>
            <Swatch className="ring-2 ring-destructive/70 ring-inset">Now sold out</Swatch>
          </>
        ) : (
          <>
            <Swatch className="bg-destructive/15">Out</Swatch>
            <Swatch className="bg-warning/15">Low</Swatch>
            <Swatch className="bg-primary/70">Most in stock</Swatch>
          </>
        )}
      </div>
    </div>
  )
}
