"use client"

import { useState } from "react"
import Link from "next/link"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, CheckCircleIcon, WarningIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Segmented } from "@/components/ui/segmented"
import { PanelsSkeleton } from "@/components/ui/table-skeleton"
import { StatStrip } from "@/components/ui/stat-strip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { getJson, queryString } from "@/lib/get-json"
import { formatMoney } from "@/lib/money"
import { Panel } from "./panel"
import { TrendChart } from "./trend-chart"

const ranges = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
]

const compare = { today: "yesterday by this time", "7d": "the 7 days before", "30d": "the 30 days before" }
const percent = (value) => `${Math.round(value * 100)}%`

const Delta = ({ now, before, label, comparable }) => {
  if (!comparable || !before) return <span>Not enough history to compare</span>
  const change = (now - before) / Math.abs(before)
  const up = change >= 0
  const Icon = up ? ArrowUpRightIcon : ArrowDownRightIcon
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={cn("size-3.5", up ? "text-success" : "text-destructive")} />
      <span className="tabular-nums">{percent(Math.abs(change))}</span> vs {label}
    </span>
  )
}

const LinkAction = ({ href, children }) => (
  <Link href={href} className="flex shrink-0 items-center gap-1 text-xs text-gold underline-offset-4 hover:underline">
    {children}
    <ArrowRightIcon className="size-3" />
  </Link>
)

const List = ({ rows, empty }) =>
  rows.length ? (
    <ul className="divide-y">
      {rows.map(({ key, title, detail, value, tone }) => (
        <li key={key} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm">{title}</p>
            {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
          </div>
          <span className={cn("shrink-0 text-sm font-semibold tabular-nums", tone === "warning" && "text-warning", tone === "destructive" && "text-destructive")}>{value}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="px-4 py-8 text-center text-sm text-muted-foreground">{empty}</p>
  )

export const DashboardScreen = ({ user }) => {
  const nameOf = useStaffName()
  const scope = useShopScope(user)
  const [range, setRange] = useState("7d")
  const { data: view, error, isPending } = useQuery({
    queryKey: ["dashboard", scope, range],
    queryFn: ({ signal }) => getJson(`/api/dashboard?${queryString({ range, shop: scope })}`, { signal }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })

  if (isPending)
    return (
      <PanelsSkeleton />
    )
  if (!view) return <p className="border border-destructive/40 bg-destructive/10 p-4 text-sm">{error?.message ?? "Could not load the dashboard."}</p>

  const { current, previous, best, short, idle, brands, cashiers, comparable, shopRows, byHour, trend, lowThreshold } = view
  const topBrand = brands[0]?.revenue ?? 0
  const label = compare[range]

  return (
    <>
      <Segmented label="Period" options={ranges} value={range} onChange={setRange} />

      <StatStrip
        stats={[
          { label: "Sales", value: formatMoney(current.revenue), hint: <Delta now={current.revenue} before={previous.revenue} label={label} comparable={comparable} /> },
          { label: "Profit", value: formatMoney(current.profit), hint: <span>{percent(current.margin)} of sales</span> },
          {
            label: "Cash short",
            value: formatMoney(view.cashShort),
            tone: view.cashShort > 0 ? "destructive" : undefined,
            hint: <span>{view.shortShifts} of {view.closedShifts} shifts</span>,
          },
          { label: "Stock value", value: formatMoney(view.stock.value), hint: <span>{view.stock.pairs.toLocaleString("en-PK")} items at cost</span> },
        ]}
      />

      <Panel
        title={byHour ? "Today" : "Sales & profit"}
        description={`${current.count} sales · ${percent(view.cashShare)} cash, ${percent(1 - view.cashShare)} card and wallets`}
      >
        <div className="p-3">
          <TrendChart data={trend} byHour={byHour} timeZone={view.timeZone} />
        </div>
      </Panel>

      {user.role === "admin" && scope === ALL_SHOPS && (
        <Panel title="Shops" description="Each shop side by side. New shops appear here as they open.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shop</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="hidden text-right @lg:table-cell">Profit</TableHead>
                <TableHead className="text-right">Cash short</TableHead>
                <TableHead className="hidden text-right @2xl:table-cell">Stock value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shopRows.map(({ shop, revenue, profit, short: shortCash, stock: value }) => (
                <TableRow key={shop.id}>
                  <TableCell className="w-full max-w-0 text-sm font-medium whitespace-normal @lg:w-auto @lg:max-w-none">
                    {shop.name}
                    <p className="text-xs font-normal text-muted-foreground tabular-nums @lg:hidden">Profit {formatMoney(profit)}</p>
                    <p className="text-xs font-normal text-muted-foreground tabular-nums @2xl:hidden">Stock {formatMoney(value)}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(revenue)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums @lg:table-cell">{formatMoney(profit)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", shortCash > 0 && "text-destructive")}>{formatMoney(shortCash)}</TableCell>
                  <TableCell className="hidden text-right text-muted-foreground tabular-nums @2xl:table-cell">{formatMoney(value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      <div className="grid gap-4 @4xl:grid-cols-3">
        <Panel title="Best sellers" description="Most items sold">
          <List
            empty="No sales in this period."
            rows={best.map(({ id, name, brand, pairs }) => ({ key: id, title: name, detail: brand, value: `${pairs} sold` }))}
          />
        </Panel>
        <Panel title="Running short" description={`${short.count} ${short.count === 1 ? "size" : "sizes"} at ${lowThreshold} ${lowThreshold === 1 ? "pair" : "pairs"} or fewer`} action={<LinkAction href="/stock">Stock</LinkAction>}>
          <List
            empty="Nothing is running short."
            rows={short.rows.map(({ id, name, color, size, quantity }) => ({
              key: id,
              title: name,
              detail: `${color} · EU ${size}`,
              value: quantity <= 0 ? "Sold out" : `${quantity} left`,
              tone: quantity <= 0 ? "destructive" : "warning",
            }))}
          />
        </Panel>
        <Panel title="Not selling" description={`No sale in 14 days · ${formatMoney(idle.value)} tied up`}>
          <List
            empty="Every product sold in the last 14 days."
            rows={idle.rows.map(({ id, name, pairs, value }) => ({ key: id, title: name, detail: `${pairs} in stock`, value: formatMoney(value) }))}
          />
        </Panel>
      </div>

      <div className="grid gap-4 @4xl:grid-cols-2">
        <Panel title="Sales by brand" description="Which brands bring the money in">
          <ul className="space-y-3 p-4">
            {brands.map(({ brand, revenue, pairs }) => (
              <li key={brand} className="space-y-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span>{brand}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatMoney(revenue)} · {pairs} sold
                  </span>
                </div>
                <div className="h-2 bg-muted">
                  <div className="h-full bg-chart-1" style={{ width: `${(revenue / topBrand) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Staff" description="Anything worth a closer look" action={user.role === "admin" && <LinkAction href="/staff">Manage access</LinkAction>}>
          <List
            empty="No staff activity."
            rows={cashiers.map((stats) => {
              const { signals } = stats
              return {
                key: stats.cashierId,
                title: nameOf(stats.cashierId),
                detail: signals.length ? (
                  <span className="flex items-center gap-1 text-warning">
                    <WarningIcon className="size-3" weight="fill" />
                    {signals.join(" · ")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircleIcon className="size-3" weight="fill" />
                    All clear
                  </span>
                ),
                value: `${stats.count} sales`,
              }
            })}
          />
        </Panel>
      </div>
    </>
  )
}
