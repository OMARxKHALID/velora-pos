"use client"

import Link from "next/link"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, CheckCircleIcon, WarningIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { LoadError } from "@/shared/components/ui/alert"
import { Panel } from "@/shared/components/ui/panel"
import { PanelsSkeleton } from "@/shared/components/ui/table-skeleton"
import { StatStrip } from "@/shared/components/ui/stat-strip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { getJson, queryString } from "@/shared/lib/get-json"
import { formatMoney } from "@/shared/lib/money"
import { DAY } from "@/shared/lib/dates"
import { SHOP_TIME_ZONE, dayIn } from "@/shared/lib/zoned"
import { useDashboardPeriod } from "../hooks/use-dashboard-period"
import { PeriodPicker } from "./period-picker"
import { TrendChart } from "./trend-chart"
import { EmptyState } from "@/shared/components/ui/empty-state"

const compare = { today: "yesterday by this time", "7d": "the 7 days before", "30d": "the 30 days before" }
const compareLabel = (range, days) => compare[range] ?? (days === 1 ? "the day before" : `the ${days} days before`)
const percent = (value) => `${Math.round(value * 100)}%`
const clock = (timeZone, at) => new Intl.DateTimeFormat("en-PK", { hour: "numeric", minute: "2-digit", timeZone }).format(at)
const daysLeftText = (days) => (days < 1 ? "under a day left" : `about ${Math.floor(days)} ${Math.floor(days) === 1 ? "day" : "days"} left`)

const Delta = ({ now, before, label, comparable, short }) => {
  if (!comparable) return <span>{short ? "No history yet" : "Not enough history to compare"}</span>
  if (!before) return <span>{short ? "Nothing before" : `Nothing ${label} to compare`}</span>
  const change = (now - before) / Math.abs(before)
  const up = change >= 0
  const Icon = up ? ArrowUpRightIcon : ArrowDownRightIcon
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className={cn("size-3.5", up ? "text-success" : "text-destructive")} />
      <span className="sr-only">{up ? "Up" : "Down"}</span>
      <span className="tabular-nums">{percent(Math.abs(change))}</span>
      {!short && <span>vs {label}</span>}
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
    <EmptyState className="py-8">{empty}</EmptyState>
  )

export const DashboardScreen = ({ user }) => {
  const nameOf = useStaffName()
  const scope = useShopScope(user)
  const period = useDashboardPeriod()
  const { range, from, to } = period
  const custom = range === "custom"
  const { data: view, error, isPending, isPlaceholderData, refetch } = useQuery({
    queryKey: custom ? ["dashboard", scope, range, from, to] : ["dashboard", scope, range],
    queryFn: ({ signal }) => getJson(`/api/dashboard?${queryString(custom ? { range, from, to, shop: scope } : { range, shop: scope })}`, { signal }),
    enabled: !period.error,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })

  const timeZone = view?.timeZone ?? SHOP_TIME_ZONE

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <PeriodPicker range={range} from={from} to={to} error={period.error} today={view && dayIn(timeZone, view.generatedAt)} onRangeChange={period.selectRange} onDatesChange={period.selectDates} />
      {view && <p className={cn("py-2.5 text-xs text-muted-foreground pointer-coarse:py-3.5", !error && "hidden @2xl:block")}>{error ? <span className="text-destructive">Could not refresh · showing {clock(timeZone, view.generatedAt)}</span> : `Updated ${clock(timeZone, view.generatedAt)}`}</p>}
    </div>
  )

  if (isPending && !period.error) return <PanelsSkeleton />
  if (isPending)
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p className="border border-dashed bg-card px-6 py-16 text-center text-sm text-muted-foreground">Pick the dates to see how the shop did.</p>
      </div>
    )
  if (!view)
    return (
      <div className="flex flex-col gap-6">
        {header}
        <LoadError message={error?.message ?? "Could not load the overview."} onRetry={refetch} />
      </div>
    )

  const { current, previous, best, short, idle, brands, cashiers, comparable, shopRows, byHour, trend, days, live } = view
  const topBrand = Math.max(0, ...brands.map(({ revenue }) => revenue))
  const label = compareLabel(range, days)
  const dayTitle = new Intl.DateTimeFormat("en-PK", { weekday: "short", day: "numeric", month: "short", timeZone }).format(view.from)
  const span = custom && days > 1 ? `${new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric", timeZone }).formatRange(view.from, view.from + (days - 1) * DAY)} · ` : ""

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div aria-busy={isPlaceholderData} className={cn("flex flex-col gap-6 transition-opacity", isPlaceholderData && "opacity-60")}>
        <StatStrip
          stats={[
            { label: "Sales", value: formatMoney(current.revenue), hint: <Delta now={current.revenue} before={previous.revenue} label={label} comparable={comparable} /> },
            {
              label: "Profit",
              value: formatMoney(current.profit),
              tone: current.profit < 0 ? "destructive" : undefined,
              hint: (
                <span className="inline-flex flex-wrap items-center gap-x-1.5">
                  <span>{percent(current.margin)} margin</span>
                  <span aria-hidden="true">·</span>
                  <Delta now={current.profit} before={previous.profit} label={label} comparable={comparable} short />
                </span>
              ),
            },
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
          title={range === "today" ? "Today" : byHour ? dayTitle : "Sales & profit"}
          description={
            current.count
              ? `${span}${current.count} ${current.count === 1 ? "sale" : "sales"} · ${formatMoney(current.basket)} average · ${percent(view.cashShare)} cash, ${percent(1 - view.cashShare)} card and wallets`
              : `${span}No sales in this period${live ? " yet" : ""}`
          }
        >
          <div className="p-3">
            <TrendChart data={trend} byHour={byHour} timeZone={timeZone} now={view.generatedAt} live={live} />
          </div>
        </Panel>

        {user.role === "admin" && scope === ALL_SHOPS && shopRows.length > 1 && (
          <Panel title="Shops" description="Each shop side by side">
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
              rows={best.map(({ id, name, brand, pairs, revenue }) => ({ key: id, title: name, detail: `${brand} · ${formatMoney(revenue)}`, value: `${pairs} sold` }))}
            />
          </Panel>
          <Panel title="Running short" description={short.count ? `${short.count} ${short.count === 1 ? "size" : "sizes"} low or selling out within a week` : "Nothing is low or selling out this week"} action={<LinkAction href="/stock">Stock</LinkAction>}>
            <List
              empty="Nothing is running short."
              rows={short.rows.map(({ id, name, color, size, quantity, daysLeft }) => ({
                key: id,
                title: name,
                detail: [`${color} · EU ${size}`, quantity > 0 && daysLeft !== null && daysLeftText(daysLeft)].filter(Boolean).join(" · "),
                value: quantity <= 0 ? "Sold out" : `${quantity} left`,
                tone: quantity <= 0 || (daysLeft !== null && daysLeft <= 3) ? "destructive" : "warning",
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
            {brands.length ? (
              <ul className="space-y-3 p-4">
                {brands.map(({ brand, revenue, pairs }) => (
                  <li key={brand} className="space-y-1.5">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{brand}</span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {formatMoney(revenue)} · {pairs} sold
                      </span>
                    </div>
                    <div className="h-2 bg-muted">
                      <div className="h-full bg-chart-1" style={{ width: `${topBrand ? (Math.max(revenue, 0) / topBrand) * 100 : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState className="py-8">No sales in this period.</EmptyState>
            )}
          </Panel>
          <Panel title="Staff" description="Anything worth a closer look" action={user.role === "admin" && <LinkAction href="/staff">Manage access</LinkAction>}>
            <List
              empty="No staff activity."
              rows={cashiers.map(({ cashierId, count, signals }) => {
                const serious = signals.some(({ tone }) => tone === "destructive")
                return {
                  key: cashierId,
                  title: nameOf(cashierId),
                  detail: signals.length ? (
                    <span className={cn("flex items-center gap-1", serious ? "text-destructive" : "text-warning")}>
                      <WarningIcon className="size-3 shrink-0" weight="fill" />
                      <span className="truncate">{signals.map(({ label: text }) => text).join(" · ")}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-success">
                      <CheckCircleIcon className="size-3" weight="fill" />
                      All clear
                    </span>
                  ),
                  value: `${count} ${count === 1 ? "sale" : "sales"}`,
                }
              })}
            />
          </Panel>
        </div>
      </div>
    </div>
  )
}
