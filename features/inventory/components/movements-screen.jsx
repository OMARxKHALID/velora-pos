"use client"

import { useDeferredValue, useState } from "react"
import { LockSimpleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { StatStrip } from "@/components/ui/stat-strip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination, paginate } from "@/components/ui/table-pagination"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { staffName } from "@/features/demo/lib/staff"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { StatusBadge } from "@/features/sales/components/sale-status-badges"
import { DAY, formatDateTime, startOfToday } from "@/lib/dates"
import { sumBy } from "@/lib/money"
import { addReasons, removeReasons } from "../schemas"

const types = [
  { key: "all", label: "All" },
  { key: "sale", label: "Sales" },
  { key: "return", label: "Returns" },
  { key: "purchase", label: "Deliveries" },
  { key: "adjustment", label: "Adjustments" },
]

const ranges = [
  { key: "today", label: "Today", from: () => startOfToday() },
  { key: "7d", label: "7 days", from: () => startOfToday() - 6 * DAY },
  { key: "all", label: "All", from: () => 0 },
]

const typeTone = { sale: "muted", return: "info", purchase: "gold", adjustment: "warning" }
const typeLabel = { sale: "Sale", return: "Return", purchase: "Delivery", adjustment: "Adjustment" }
const reasonLabel = { ...addReasons, ...removeReasons }

const referenceFor = (movement) => {
  if (movement.type === "adjustment") return [reasonLabel[movement.reason], movement.note].filter(Boolean).join(" · ")
  return movement.ref?.number ?? "—"
}

export const MovementsScreen = () => {
  const movements = useDemoStore(({ movements }) => movements)
  const { productById, variantById } = useCatalog()
  const [type, setType] = useState("all")
  const [range, setRange] = useState("7d")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const search = useDeferredValue(query.trim().toLowerCase())
  const from = ranges.find(({ key }) => key === range).from()

  const inRange = movements.filter(({ createdAt }) => new Date(createdAt).getTime() >= from)
  const visible = inRange
    .filter((movement) => {
      if (type !== "all" && movement.type !== type) return false
      if (!search) return true
      const variant = variantById[movement.variantId]
      return `${productById[variant.productId].name} ${variant.sku} ${variant.barcode} ${movement.ref?.number ?? ""} ${staffName(movement.userId)}`.toLowerCase().includes(search)
    })
    .toReversed()
  const pagination = paginate(visible, page)

  const withReset = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <StatStrip
        stats={[
          { label: "Movements", value: inRange.length },
          { label: "Pairs in", value: `+${sumBy(inRange.filter(({ quantity }) => quantity > 0), ({ quantity }) => quantity)}` },
          { label: "Pairs out", value: sumBy(inRange.filter(({ quantity }) => quantity < 0), ({ quantity }) => quantity) },
          { label: "Adjustments", value: inRange.filter(({ type: kind }) => kind === "adjustment").length, tone: "warning" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="h-9 w-full sm:w-72">
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} placeholder="Shoe, SKU, receipt or person" />
        </InputGroup>
        <Segmented options={types} value={type} onChange={withReset(setType)} />
        <Segmented options={ranges} value={range} onChange={withReset(setRange)} />
      </div>

      <div className="border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="hidden text-right sm:table-cell">After</TableHead>
              <TableHead className="hidden lg:table-cell">By</TableHead>
              <TableHead className="hidden md:table-cell">Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.rows.map((movement) => {
              const variant = variantById[movement.variantId]
              return (
                <TableRow key={movement.id}>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(movement.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge tone={typeTone[movement.type]}>{typeLabel[movement.type]}</StatusBadge>
                  </TableCell>
                  <TableCell className="max-w-56">
                    <p className="truncate text-sm">{productById[variant.productId].name}</p>
                    <p className="text-xs text-muted-foreground">
                      {variant.attributes.color} · EU {variant.attributes.size}
                    </p>
                  </TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums", movement.quantity > 0 ? "text-success" : "text-destructive")}>
                    {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{movement.balanceAfter}</TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">{staffName(movement.userId)}</TableCell>
                  <TableCell className="hidden max-w-48 truncate text-xs text-muted-foreground md:table-cell">{referenceFor(movement)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {!visible.length && <p className="py-12 text-center text-sm text-muted-foreground">No movements match.</p>}
        <TablePagination {...pagination} onPageChange={setPage} />
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <LockSimpleIcon className="size-3.5 text-gold" />
        Movements are append-only. Nobody, including the admin, can edit or delete one.
      </p>
    </>
  )
}
