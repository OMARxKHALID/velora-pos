"use client"

import { useDeferredValue, useState } from "react"
import { LockSimpleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/components/ui/input-group"
import { Segmented } from "@/shared/components/ui/segmented"
import { useUrlState } from "@/shared/hooks/use-url-state"
import { DataTable } from "@/shared/components/ui/data-table"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { TablePageSkeleton } from "@/shared/components/ui/table-skeleton"
import { resetsPage } from "@/shared/components/ui/table-pagination"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { formatDateTime } from "@/shared/lib/dates"
import { getJson, queryString } from "@/shared/lib/get-json"
import { addReasons, removeReasons } from "../schemas"
import { LoadError } from "@/shared/components/ui/alert"
import { Surface } from "@/shared/components/ui/surface"

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

const typeKeys = types.map(({ key }) => key)

const rangeKeys = ranges.map(({ key }) => key)

const typeLabel = { sale: "Sold", return: "Returned", exchange: "Exchanged", purchase: "Delivery", adjustment: "Fixed" }
const reasonLabel = { ...addReasons, ...removeReasons }

const referenceFor = (movement) => {
  if (movement.type === "adjustment") return [reasonLabel[movement.reason], movement.note].filter(Boolean).join(" · ")
  return movement.ref?.number ?? "—"
}

export const StockHistoryScreen = ({ user }) => {
  const scope = useShopScope(user)
  const nameOf = useStaffName()
  const [type, setType] = useUrlState("type", "all", typeKeys)
  const [range, setRange] = useUrlState("range", "7d", rangeKeys)
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const search = useDeferredValue(query.trim())
  const filters = { type: type === "all" ? undefined : type, range, q: search, shop: scope, page }
  const { data, error, isPending, isPlaceholderData, refetch } = useQuery({
    queryKey: ["movements", filters],
    queryFn: ({ signal }) => getJson(`/api/movements?${queryString(filters)}`, { signal }),
    placeholderData: keepPreviousData,
  })
  const rows = data?.rows ?? []
  const columns = [
    {
      id: "item",
      header: "Item",
      meta: { cellClassName: "max-w-64" },
      cell: ({ row: { original: movement } }) => (
        <>
          <p className="truncate text-sm">{movement.productName ?? "Deleted product"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {movement.label ?? movement.sku ?? movement.variantId} · {referenceFor(movement)}
          </p>
          <p className="truncate text-xs text-muted-foreground @lg:hidden">
            {formatDateTime(movement.createdAt)} · {nameOf(movement.userId)}
          </p>
          <p className="hidden truncate text-xs text-muted-foreground @lg:block @4xl:hidden">By {nameOf(movement.userId)}</p>
        </>
      ),
    },
    {
      id: "change",
      header: "Change",
      meta: { className: "text-right" },
      cell: ({ row: { original: movement } }) => (
        <>
          <p className={cn("font-semibold tabular-nums", movement.quantity > 0 ? "text-success" : "text-destructive")}>{movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}</p>
          <p className="text-xs text-muted-foreground">{typeLabel[movement.type]}</p>
        </>
      ),
    },
    { id: "when", header: "When", meta: { className: "hidden @lg:table-cell", cellClassName: "text-xs whitespace-nowrap text-muted-foreground" }, cell: ({ row }) => formatDateTime(row.original.createdAt) },
    { id: "by", header: "By", meta: { className: "hidden @4xl:table-cell", cellClassName: "text-sm" }, cell: ({ row }) => nameOf(row.original.userId) },
  ]

  const withReset = resetsPage(setPage)

  if (isPending) return <TablePageSkeleton />

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <InputGroup className="w-full @xl:w-72">
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} aria-label="Search stock history" placeholder="Product, SKU, receipt or person…" />
        </InputGroup>
        <Segmented label="Movement type" options={types} value={type} onChange={withReset(setType)} />
        <Segmented label="Date range" options={ranges} value={range} onChange={withReset(setRange)} />
      </div>

      <Surface aria-busy={isPlaceholderData} className={cn("transition-opacity", isPlaceholderData && "opacity-60")}>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={({ id }) => id}
          empty={error && !data ? <LoadError message={error.message} onRetry={refetch} className="text-left" /> : "Nothing in the stock history matches."}
          page={data?.page ?? page}
          pageSize={data?.pageSize}
          total={data?.total ?? 0}
          onPageChange={setPage}
        />
      </Surface>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <LockSimpleIcon className="size-3.5 text-gold" />
        History cannot be edited or deleted by anyone.
      </p>
    </>
  )
}
