import { ALL_SHOPS, scopeState } from "@/features/shops/lib/shops"
import { sumBy } from "@/shared/lib/money"
import {
  brandPerformance,
  cashierIdsFor,
  cashierStats,
  dailySeries,
  hourlySeries,
  notSelling,
  paymentSplit,
  productPerformance,
  runningShort,
  signalsFor,
  stockValue,
  summarize,
  within,
} from "./analytics"
import { DAY } from "@/shared/lib/dates"

const headline = ({ revenue, profit, margin, count, basket, pairs }) => ({ revenue, profit, margin, count, basket, pairs })

const shortOf = (shifts) => sumBy(shifts.filter(({ difference }) => difference < 0), ({ difference }) => -difference)

export const dashboardView = (full, { scope = ALL_SHOPS, period, range, staff = {}, lowThreshold = 2, shops = [], firstSaleAt = null, hourOf, timeZone, now = Date.now() }) => {
  const state = scopeState(full, scope)
  const current = summarize(state, period.from, period.to)
  const previous = summarize(state, period.prevFrom, period.prevTo)
  const closedShifts = within(state.shifts.filter(({ status }) => status === "closed"), "closedAt", period.from, period.to)
  const short = runningShort(state, { threshold: lowThreshold, now })
  const idle = notSelling(state, 14, now)
  const byHour = period.days === 1

  return {
    range,
    byHour,
    timeZone,
    generatedAt: now,
    days: period.days,
    from: period.from,
    live: period.to >= now,
    comparable: firstSaleAt !== null && new Date(firstSaleAt).getTime() <= period.prevFrom + DAY,
    current: headline(current),
    previous: headline(previous),
    trend: byHour ? hourlySeries(current, hourOf ? { hourOf } : undefined) : dailySeries(current, period.from, period.days),
    cashShare: paymentSplit(current.sales).cashShare,
    stock: stockValue(state),
    cashShort: shortOf(closedShifts),
    shortShifts: closedShifts.filter(({ difference }) => difference < 0).length,
    closedShifts: closedShifts.length,
    best: productPerformance(state, current.sales)
      .filter(({ pairs }) => pairs > 0)
      .toSorted((a, b) => b.pairs - a.pairs || b.revenue - a.revenue)
      .slice(0, 5)
      .map(({ product, pairs, revenue }) => ({ id: product.id, name: product.name, brand: product.brand, pairs, revenue })),
    short: {
      count: short.length,
      rows: short.slice(0, 5).map(({ variant, product, quantity, daysLeft }) => ({ id: variant.id, name: product.name, color: variant.attributes.color, size: variant.attributes.size, quantity, daysLeft })),
    },
    idle: {
      value: sumBy(idle, ({ value }) => value),
      rows: idle.slice(0, 5).map(({ product, stock, value }) => ({ id: product.id, name: product.name, pairs: stock, value })),
    },
    brands: brandPerformance(state, current.sales).slice(0, 6),
    cashiers: cashierStats(state, current.sales, current.refunds, period.from, period.to, cashierIdsFor(state, staff))
      .map((stats) => ({ cashierId: stats.cashierId, count: stats.count, signals: signalsFor(stats) }))
      .toSorted((a, b) => b.signals.length - a.signals.length || b.count - a.count),
    shopRows: shops.map((shop) => {
      const shopState = scopeState(full, shop.id)
      const summary = summarize(shopState, period.from, period.to)
      return {
        shop,
        revenue: summary.revenue,
        profit: summary.profit,
        short: shortOf(within(shopState.shifts.filter(({ status }) => status === "closed"), "closedAt", period.from, period.to)),
        stock: stockValue(shopState).value,
      }
    }),
  }
}
