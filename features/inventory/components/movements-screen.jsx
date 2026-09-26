"use client"

import { useDeferredValue, useState } from "react"
import { LockSimpleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { TablePagination } from "@/components/ui/table-pagination"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { formatDateTime } from "@/lib/dates"
import { getJson, queryString } from "@/lib/get-json"
import { addReasons, removeReasons } from "../schemas"

const types = [
  { key: "all", label: "All" },
  { key: "sale", label: "Sales" },
  { key: "return", label: "Returns" },
  { key: "exchange", label: "Exchanges" },
  { key: "purchase", label: "Deliveries" },
  { key: "adjustment", label: "Fixes" },
]

const ranges = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "all", label: "All" },
]

const typeLabel = { sale: "Sold", return: "Returned", exchange: "Exchanged", purchase: "Delivery", adjustment: "Fixed" }
const reasonLabel = { ...addReasons, ...removeReasons }

const referenceFor = (movement) => {
  if (movement.type === "adjustment") return [reasonLabel[movement.reason], movement.note].filter(Boolean).join(" · ")
  return movement.ref?.number ?? "—"
}

export const MovementsScreen = ({ user }) => {
  const scope = useShopScope(user)
  const nameOf = useStaffName()
  const [type, setType] = useState("all")
  const [range, setRange] = useState("7d")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const search = useDeferredValue(query.trim())
  const filters = { type: type === "all" ? undefined : type, range, q: search, shop: scope, page }
  const { data, error, isPending } = useQuery({
    queryKey: ["movements", filters],
    queryFn: ({ signal }) => getJson(`/api/movements?${queryString(filters)}`, { signal }),
    placeholderData: keepPreviousData,
  })
  const rows = data?.rows ?? []
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  const withReset = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <InputGroup className="w-full @xl:w-72">
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} placeholder="Product, SKU, receipt or person" />
        </InputGroup>
        <Segmented label="Movement type" options={types} value={type} onChange={withReset(setType)} />
        <Segmented label="Date range" options={ranges} value={range} onChange={withReset(setRange)} />
      </div>

      <div className="border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead className="hidden @lg:table-cell">When</TableHead>
              <TableHead className="hidden @4xl:table-cell">By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((movement) => {
              return (
                <TableRow key={movement.id}>
                  <TableCell className="max-w-64">
                    <p className="truncate text-sm">{movement.productName ?? "Deleted product"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {movement.label ?? movement.sku ?? movement.variantId} · {referenceFor(movement)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground @lg:hidden">
                      {formatDateTime(movement.createdAt)} · {nameOf(movement.userId)}
                    </p>
                    <p className="hidden truncate text-xs text-muted-foreground @lg:block @4xl:hidden">By {nameOf(movement.userId)}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <p className={cn("font-semibold tabular-nums", movement.quantity > 0 ? "text-success" : "text-destructive")}>
                      {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">{typeLabel[movement.type]}</p>
                  </TableCell>
                  <TableCell className="hidden text-xs whitespace-nowrap text-muted-foreground @lg:table-cell">{formatDateTime(movement.createdAt)}</TableCell>
                  <TableCell className="hidden text-sm @4xl:table-cell">{nameOf(movement.userId)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {isPending && <TableSkeleton label="Loading stock history" />}
        {error && !data && <p className="py-12 text-center text-sm text-destructive-foreground">{error.message}</p>}
        {data && !rows.length && <p className="py-12 text-center text-sm text-muted-foreground">No movements match.</p>}
        {data && <TablePagination page={data.page} pageCount={pageCount} total={data.total} size={data.pageSize} onPageChange={setPage} />}
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <LockSimpleIcon className="size-3.5 text-gold" />
        History cannot be edited or deleted by anyone.
      </p>
    </>
  )
}
