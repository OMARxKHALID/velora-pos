"use client"

import { useDeferredValue, useState } from "react"
import { LockSimpleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination, paginate } from "@/components/ui/table-pagination"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { staffName } from "@/features/demo/lib/staff"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { DAY, formatDateTime, startOfToday } from "@/lib/dates"
import { addReasons, removeReasons } from "../schemas"

const types = [
  { key: "all", label: "All" },
  { key: "sale", label: "Sales" },
  { key: "return", label: "Returns" },
  { key: "purchase", label: "Deliveries" },
  { key: "adjustment", label: "Fixes" },
]

const ranges = [
  { key: "today", label: "Today", from: () => startOfToday() },
  { key: "7d", label: "7 days", from: () => startOfToday() - 6 * DAY },
  { key: "all", label: "All", from: () => 0 },
]

const typeLabel = { sale: "Sold", return: "Returned", purchase: "Delivery", adjustment: "Fixed" }
const reasonLabel = { ...addReasons, ...removeReasons }

const referenceFor = (movement) => {
  if (movement.type === "adjustment") return [reasonLabel[movement.reason], movement.note].filter(Boolean).join(" · ")
  return movement.ref?.number ?? "—"
}

export const MovementsScreen = ({ user }) => {
  const allMovements = useDemoStore(({ movements }) => movements)
  const scope = useShopScope(user)
  const movements = scope === ALL_SHOPS ? allMovements : allMovements.filter(({ shopId }) => shopId === scope)
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
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <InputGroup className="h-9 w-full sm:w-64 lg:w-72">
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} placeholder="Shoe, SKU, receipt or person" />
        </InputGroup>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 [scrollbar-width:none]">
          <Segmented options={types} value={type} onChange={withReset(setType)} />
          <Segmented options={ranges} value={range} onChange={withReset(setRange)} />
        </div>
      </div>

      <div className="overflow-x-auto border bg-card [scrollbar-width:thin]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="hidden sm:table-cell">When</TableHead>
              <TableHead className="hidden lg:table-cell">By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.rows.map((movement) => {
              const variant = variantById[movement.variantId]
              return (
                <TableRow key={movement.id}>
                  <TableCell className="max-w-64">
                    <p className="truncate text-sm">{productById[variant.productId].name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {variant.attributes.color} · EU {variant.attributes.size} · {referenceFor(movement)}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className={cn("font-semibold tabular-nums", movement.quantity > 0 ? "text-success" : "text-destructive")}>
                      {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">{typeLabel[movement.type]}</p>
                  </TableCell>
                  <TableCell className="hidden text-xs whitespace-nowrap text-muted-foreground sm:table-cell">{formatDateTime(movement.createdAt)}</TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">{staffName(movement.userId)}</TableCell>
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
        History cannot be edited or deleted by anyone.
      </p>
    </>
  )
}
