"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, CheckCircleIcon, WarningIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Segmented } from "@/components/ui/segmented"
import { StatStrip } from "@/components/ui/stat-strip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { staff, staffName } from "@/features/demo/lib/staff"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { StatusBadge } from "@/features/sales/components/sale-status-badges"
import { formatDateTime } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { cashierStats, dailySeries, hourlySeries, lowStock, periodFor, productPerformance, signalsFor, summarize } from "../lib/analytics"
import { HourlyChart } from "./hourly-chart"
import { Panel } from "./panel"
import { TrendChart } from "./trend-chart"

const ranges = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
]

const compare = { today: "yesterday by this time", "7d": "the 7 days before", "30d": "the 30 days before" }
const cashierIds = Object.values(staff)
  .filter(({ role }) => role === "cashier")
  .map(({ id }) => id)
const percent = (value) => `${(value * 100).toFixed(1)}%`

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

export const DashboardScreen = () => {
  const state = useDemoStore((store) => store)
  const [range, setRange] = useState("7d")
  const period = periodFor(range)
  const current = summarize(state, period.from, period.to)
  const previous = summarize(state, period.prevFrom, period.prevTo)
  const byHour = range === "today"
  const trend = byHour ? hourlySeries(current.sales) : dailySeries(current.sales, period.from, period.days)
  const performance = productPerformance(state, current.sales)
  const top = performance.toSorted((a, b) => b.pairs - a.pairs || b.revenue - a.revenue).slice(0, 5)
  const slow = performance.filter(({ stock }) => stock > 0).toSorted((a, b) => a.pairs - b.pairs || b.stock - a.stock).slice(0, 5)
  const low = lowStock(state)
  const cashiers = cashierStats(state, current.sales, current.refunds, period.from, period.to, cashierIds)
  const shifts = state.shifts.filter(({ status }) => status === "closed").slice(-6).toReversed()
  const label = compare[range]
  const firstSale = state.sales[0] ? new Date(state.sales[0].soldAt).getTime() : Infinity
  const comparable = firstSale <= period.prevFrom + 24 * 60 * 60 * 1000

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented options={ranges} value={range} onChange={setRange} />
        <p className="text-xs text-muted-foreground">Revenue and profit are after approved refunds. Profit uses the cost saved on each sale.</p>
      </div>

      <StatStrip
        stats={[
          { label: "Net revenue", value: formatMoney(current.revenue), hint: <Delta now={current.revenue} before={previous.revenue} label={label} comparable={comparable} /> },
          { label: "Gross profit", value: formatMoney(current.profit), hint: <span>{percent(current.margin)} margin</span> },
          { label: "Sales", value: current.count, hint: <span>Avg. basket {formatMoney(current.basket)}</span> },
          { label: "Pairs sold", value: current.pairs, hint: <Delta now={current.pairs} before={previous.pairs} label={label} comparable={comparable} /> },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title={byHour ? "Today by hour" : "Revenue & profit"} description={byHour ? "Revenue and profit per hour today" : `Per day, last ${period.days} days`} className="xl:col-span-2">
          <div className="p-3">
            <TrendChart data={trend} byHour={byHour} />
          </div>
        </Panel>
        <Panel title="Busiest hours" description="Number of sales per hour in this period">
          <div className="p-3">
            <HourlyChart data={hourlySeries(current.sales)} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top sellers" description="Most pairs sold in this period" action={<LinkAction href="/products">Products</LinkAction>}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shoe</TableHead>
                <TableHead className="text-right">Pairs</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top.map(({ product, pairs, revenue }) => (
                <TableRow key={product.id}>
                  <TableCell className="max-w-56 truncate text-sm">{product.name}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{pairs}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{formatMoney(revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
        <Panel title="Slow movers" description="In stock but barely selling. Consider a campaign or moving them." action={<LinkAction href="/stock">Stock</LinkAction>}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shoe</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">In stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slow.map(({ product, pairs, stock }) => (
                <TableRow key={product.id}>
                  <TableCell className="max-w-56 truncate text-sm">{product.name}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{pairs}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>

      <Panel title="Cashier watch" description="Discounts, refunds and cash differences per cashier. Flags are prompts to look closer, not proof.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cashier</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="hidden text-right md:table-cell">Revenue</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Refunds</TableHead>
              <TableHead className="text-right">Cash diff.</TableHead>
              <TableHead className="hidden lg:table-cell">Signals</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashiers.map((stats) => {
              const signals = signalsFor(stats)
              return (
                <TableRow key={stats.cashierId}>
                  <TableCell className="text-sm font-medium">{staffName(stats.cashierId)}</TableCell>
                  <TableCell className="text-right tabular-nums">{stats.count}</TableCell>
                  <TableCell className="hidden text-right text-sm tabular-nums md:table-cell">{formatMoney(stats.revenue)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", stats.discountRate > 0.025 && "font-semibold text-warning")}>{percent(stats.discountRate)}</TableCell>
                  <TableCell className={cn("hidden text-right tabular-nums sm:table-cell", stats.refundRate > 0.03 && "font-semibold text-warning")}>
                    {stats.refundCount} · {percent(stats.refundRate)}
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums", stats.cashDifference < 0 && "font-semibold text-destructive")}>
                    {stats.cashDifference ? formatMoney(stats.cashDifference) : "—"}
                    <span className="block text-[0.65rem] font-normal text-muted-foreground">
                      {stats.shortShifts}/{stats.shiftCount} shifts short
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {signals.length ? (
                        signals.map(({ tone, label: text }) => (
                          <StatusBadge key={text} tone={tone}>
                            <WarningIcon className="mr-1 size-3" weight="fill" />
                            {text}
                          </StatusBadge>
                        ))
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <CheckCircleIcon className="size-3.5" weight="fill" />
                          Clear
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Low stock" description={`${low.length} sizes at 2 pairs or fewer`} action={<LinkAction href="/stock">Reorder</LinkAction>}>
          <ul className="divide-y">
            {low.slice(0, 6).map(({ variant, product, quantity }) => (
              <li key={variant.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate">
                  {product.name}
                  <span className="text-muted-foreground">
                    {" "}
                    · {variant.attributes.color} · EU {variant.attributes.size}
                  </span>
                </span>
                <StatusBadge tone={quantity <= 0 ? "destructive" : "warning"}>{quantity <= 0 ? "Sold out" : `${quantity} left`}</StatusBadge>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Recent shift closings" description="Counted cash against what the system expected">
          <ul className="divide-y">
            {shifts.map((shift) => (
              <li key={shift.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate">
                  {staffName(shift.cashierId)}
                  <span className="text-muted-foreground"> · {formatDateTime(shift.closedAt)}</span>
                </span>
                <StatusBadge tone={shift.difference === 0 ? "muted" : shift.difference < 0 ? "destructive" : "warning"}>
                  {shift.difference === 0 ? "Matched" : `${shift.difference < 0 ? "Short" : "Over"} ${formatMoney(Math.abs(shift.difference))}`}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}
