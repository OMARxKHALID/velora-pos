import { indexCatalog, seedCatalog } from "@/features/catalog/lib/catalog"
import { lineDiscount } from "@/features/pricing/lib/pricing"
import {
  applyAdjustment,
  applyCloseShift,
  applyOpenShift,
  applyPurchase,
  applyRefundDecision,
  applyRefundRequest,
  applySale,
  emptyLedger,
  expectedCash,
} from "./ledger"

const MINUTE = 60000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const shifts = [
  { cashierId: "u-cashier", from: 10, to: 20, discountChance: 0.12, refundChance: 0.03, shortage: 0.15 },
]

const refundReasons = ["Wrong size", "Sole defect", "Customer changed mind", "Colour mismatch"]

const seedCustomers = [
  { name: "Muhammad Usman", phone: "0300 8472910" },
  { name: "Ayesha Malik", phone: "0321 4589201" },
  { name: "Zainab Tariq", phone: "0333 9128374" },
  { name: "Hamza Bilal", phone: "0312 6748291" },
  { name: "Fatima Noor", phone: "0345 1029384" },
  { name: "Omer Farooq", phone: "0301 5567823" },
  { name: "Bilal Hassan", phone: "0322 7819203" },
  { name: "Sadia Khan", phone: "0304 6619283" },
]

export const createSeed = (now = Date.now()) => {
  const catalog = seedCatalog()
  const { products, variants } = catalog
  const { productById, variantsByProduct } = indexCatalog(catalog)
  const random = mulberry32(2026)
  const pick = (list) => list[Math.floor(random() * list.length)]
  const between = (min, max) => min + Math.floor(random() * (max - min + 1))
  const popularity = products.flatMap((product) => Array(product.popularity).fill(product.id))
  const today = new Date(now).setHours(0, 0, 0, 0)
  const start = today - 30 * DAY

  let state = { ...emptyLedger(), ...catalog }
  const run = (reducer, input) => {
    const result = reducer(state, input)
    state = result.state
    return result.record
  }

  run(applyPurchase, {
    lines: variants.map(({ id, cost }) => ({ variantId: id, quantity: between(5, 12), unitCost: cost })),
    supplier: "Opening stock",
    receivedBy: "u-manager",
    at: start - DAY + 9 * HOUR,
  })

  const pickVariant = () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const variant = pick(variantsByProduct[pick(popularity)])
      if ((state.stock[variant.id] ?? 0) > 0) return variant
    }
    return null
  }

  for (let day = start; day <= today; day += DAY) {
    const isToday = day === today
    const weekend = [0, 6].includes(new Date(day).getDay())

    if (day === start + 14 * DAY) {
      const lowLines = variants
        .filter(({ id }) => (state.stock[id] ?? 0) <= 1)
        .slice(0, 140)
        .map(({ id, cost }) => ({ variantId: id, quantity: between(4, 8), unitCost: cost }))
      if (lowLines.length) run(applyPurchase, { lines: lowLines, supplier: "Velora Warehouse", receivedBy: "u-manager", at: day + 9 * HOUR })
    }

    for (const plan of shifts) {
      const openAt = day + plan.from * HOUR
      const closeAt = isToday ? Math.min(day + plan.to * HOUR, now - 10 * MINUTE) : day + plan.to * HOUR
      if (isToday && closeAt <= openAt + 30 * MINUTE) continue

      const shift = run(applyOpenShift, { cashierId: plan.cashierId, openingCash: 1000000, at: openAt })
      const saleCount = Math.round(((closeAt - openAt) / HOUR) * (weekend ? 2.6 : 1.8) * (0.7 + random() * 0.6))
      const soldInShift = []

      const times = Array.from({ length: saleCount }, () => openAt + Math.floor(random() * (closeAt - openAt - 10 * 60000))).toSorted((a, b) => a - b)

      for (const at of times) {
        const lines = []
        const first = pickVariant()
        if (!first) continue
        lines.push({ variantId: first.id, quantity: 1, entry: random() < 0.9 ? "scan" : "manual" })
        if (random() < 0.18) {
          const second = pickVariant()
          if (second && second.id !== first.id) lines.push({ variantId: second.id, quantity: 1, entry: "scan" })
        }

        const discounted = random() < plan.discountChance
        const discountPct = discounted ? pick([5, 10, 15]) : 0
        const withDiscount = lines.map((line) => {
          const variant = variants.find(({ id }) => id === line.variantId)
          return {
            ...line,
            productDiscount: lineDiscount(variant.price, productById[variant.productId].discountPct ?? 0),
            discount: lineDiscount(variant.price, discountPct),
          }
        })
        const total = withDiscount.reduce(
          (sum, line) => sum + variants.find(({ id }) => id === line.variantId).price - line.discount - line.productDiscount,
          0
        )
        const byCard = random() < 0.4
        const tendered = byCard ? total : Math.ceil(total / 100000) * 100000

        const customer = random() < 0.35 ? pick(seedCustomers) : null

        const sale = run(applySale, {
          lines: withDiscount,
          payments: [{ method: byCard ? "card" : "cash", amount: tendered }],
          cashierId: plan.cashierId,
          shiftId: shift.id,
          approvedBy: discountPct > 5 ? "u-manager" : null,
          at,
          customerName: customer?.name,
          customerPhone: customer?.phone,
        })
        soldInShift.push(sale)
      }

      for (const sale of soldInShift.filter(() => random() < plan.refundChance)) {
        const item = sale.items[0]
        const refund = run(applyRefundRequest, {
          saleId: sale.id,
          lines: [{ variantId: item.variantId, quantity: 1, restock: random() < 0.85 }],
          reason: pick(refundReasons),
          method: sale.payments[0].method,
          requestedBy: plan.cashierId,
          shiftId: shift.id,
          at: Math.min(sale.soldAt + HOUR, closeAt),
        })
        if (day < today - DAY) {
          run(applyRefundDecision, { refundId: refund.id, approve: random() < 0.75, userId: "u-manager", at: Math.min(refund.createdAt + HOUR, closeAt) })
        }
      }

      const expected = expectedCash(state, state.shifts.find(({ id }) => id === shift.id))
      const short = random() < plan.shortage ? pick([50000, 150000, 250000, 300000]) : 0
      run(applyCloseShift, { shiftId: shift.id, countedCash: expected - short, closedBy: plan.cashierId, at: closeAt })
    }

    if (day === start + 9 * DAY || day === start + 22 * DAY) {
      const damaged = variants.find(({ id }) => (state.stock[id] ?? 0) > 2)
      run(applyAdjustment, { variantId: damaged.id, quantity: -1, reason: "damaged", note: "Scuffed on display", userId: "u-manager", at: day + 11 * HOUR })
    }
  }

  const refunded = new Set(state.refunds.map(({ saleId }) => saleId))
  const recent = state.sales.filter(({ id, cashierId }) => cashierId === "u-cashier" && !refunded.has(id)).slice(-2)
  for (const [index, sale] of recent.entries()) {
    run(applyRefundRequest, {
      saleId: sale.id,
      lines: [{ variantId: sale.items[0].variantId, quantity: 1, restock: true }],
      reason: refundReasons[index],
      method: sale.payments[0].method,
      requestedBy: sale.cashierId,
      shiftId: sale.shiftId,
      at: Math.min(sale.soldAt + 30 * MINUTE, now),
    })
  }

  return state
}
