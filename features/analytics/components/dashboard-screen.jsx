"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, CheckCircleIcon, WarningIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Segmented } from "@/components/ui/segmented"
import { StatStrip } from "@/components/ui/stat-strip"
import { staff, staffName } from "@/features/demo/lib/staff"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { formatMoney, sumBy } from "@/lib/money"
import {
  brandPerformance,
  cashierStats,
  dailySeries,
  hourlySeries,
  lowStock,
  notSelling,
  paymentSplit,
  periodFor,
  productPerformance,
  signalsFor,
  stockValue,
  summarize,
  within,
} from "../lib/analytics"
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

export const DashboardScreen = () => {
  const state = useDemoStore((store) => store)
  const [range, setRange] = useState("7d")
  const period = periodFor(range)
  const current = summarize(state, period.from, period.to)
  const previous = summarize(state, period.prevFrom, period.prevTo)
  const byHour = range === "today"
  const trend = byHour ? hourlySeries(current.sales) : dailySeries(current.sales, period.from, period.days)
  const best = productPerformance(state, current.sales)
    .filter(({ pairs }) => pairs > 0)
    .toSorted((a, b) => b.pairs - a.pairs || b.revenue - a.revenue)
    .slice(0, 5)
  const short = lowStock(state)
  const idle = notSelling(state)
  const brands = brandPerformance(state, current.sales).slice(0, 6)
  const topBrand = brands[0]?.revenue ?? 0
  const payments = paymentSplit(current.sales)
  const stock = stockValue(state)
  const shifts = within(state.shifts.filter(({ status }) => status === "closed"), "closedAt", period.from, period.to)
  const cashShort = sumBy(shifts.filter(({ difference }) => difference < 0), ({ difference }) => -difference)
  const cashiers = cashierStats(state, current.sales, current.refunds, period.from, period.to, cashierIds)
  const firstSale = state.sales[0] ? new Date(state.sales[0].soldAt).getTime() : Infinity
  const comparable = firstSale <= period.prevFrom + 24 * 60 * 60 * 1000
  const label = compare[range]

  return (
    <>
      <Segmented options={ranges} value={range} onChange={setRange} />

      <StatStrip
        stats={[
          { label: "Sales", value: formatMoney(current.revenue), hint: <Delta now={current.revenue} before={previous.revenue} label={label} comparable={comparable} /> },
          { label: "Profit", value: formatMoney(current.profit), hint: <span>{percent(current.margin)} of sales</span> },
          {
            label: "Cash short",
            value: formatMoney(cashShort),
            tone: cashShort > 0 ? "destructive" : undefined,
            hint: <span>{shifts.filter(({ difference }) => difference < 0).length} of {shifts.length} shifts</span>,
          },
          { label: "Stock value", value: formatMoney(stock.value), hint: <span>{stock.pairs.toLocaleString("en-PK")} pairs at cost</span> },
        ]}
      />

      <Panel
        title={byHour ? "Today" : "Sales & profit"}
        description={`${current.count} sales · ${percent(payments.cashShare)} cash, ${percent(1 - payments.cashShare)} card`}
      >
        <div className="p-3">
          <TrendChart data={trend} byHour={byHour} />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Best sellers" description="Most pairs sold">
          <List
            empty="No sales in this period."
            rows={best.map(({ product, pairs }) => ({ key: product.id, title: product.name, detail: product.brand, value: `${pairs} sold` }))}
          />
        </Panel>
        <Panel title="Running short" description={`${short.length} sizes at 2 pairs or fewer`} action={<LinkAction href="/stock">Stock</LinkAction>}>
          <List
            empty="Nothing is running short."
            rows={short.slice(0, 5).map(({ variant, product, quantity }) => ({
              key: variant.id,
              title: product.name,
              detail: `${variant.attributes.color} · EU ${variant.attributes.size}`,
              value: quantity <= 0 ? "Sold out" : `${quantity} left`,
              tone: quantity <= 0 ? "destructive" : "warning",
            }))}
          />
        </Panel>
        <Panel title="Not selling" description={`No sale in 14 days · ${formatMoney(sumBy(idle, ({ value }) => value))} tied up`}>
          <List
            empty="Every shoe sold in the last 14 days."
            rows={idle.slice(0, 5).map(({ product, stock: pairs, value }) => ({ key: product.id, title: product.name, detail: `${pairs} pairs in stock`, value: formatMoney(value) }))}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Sales by brand" description="Which brands bring the money in">
          <ul className="space-y-3 p-4">
            {brands.map(({ brand, revenue, pairs }) => (
              <li key={brand} className="space-y-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span>{brand}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatMoney(revenue)} · {pairs} pairs
                  </span>
                </div>
                <div className="h-2 bg-muted">
                  <div className="h-full bg-chart-1" style={{ width: `${(revenue / topBrand) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Staff" description="Anything worth a closer look" action={<LinkAction href="/staff">Manage access</LinkAction>}>
          <List
            empty="No staff activity."
            rows={cashiers.map((stats) => {
              const signals = signalsFor(stats)
              return {
                key: stats.cashierId,
                title: staffName(stats.cashierId),
                detail: signals.length ? (
                  <span className="flex items-center gap-1 text-warning">
                    <WarningIcon className="size-3" weight="fill" />
                    {signals.map(({ label: text }) => text).join(" · ")}
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
