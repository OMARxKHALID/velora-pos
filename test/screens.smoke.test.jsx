import { describe, expect, test } from "bun:test"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderToString } from "react-dom/server"
import { periodFor } from "@/features/analytics/lib/analytics"
import { dashboardView } from "@/features/analytics/lib/dashboard-view"
import { DashboardScreen } from "@/features/analytics/components/dashboard-screen"
import { ProductsScreen } from "@/features/catalog/components/products-screen"
import { MovementsScreen } from "@/features/inventory/components/movements-screen"
import { StockScreen } from "@/features/inventory/components/stock-screen"
import { PosScreen } from "@/features/pos/components/pos-screen"
import { RefundsScreen } from "@/features/refunds/components/refunds-screen"
import { SalesScreen } from "@/features/sales/components/sales-screen"
import { SettingsScreen } from "@/features/settings/components/settings-screen"
import { StaffScreen } from "@/features/staff/components/staff-screen"
import { toSessionUser } from "@/features/auth/lib/roles"
import { SAMPLE_TEAM } from "@/features/sample-data/lib/team"
import { applyCloseShift, applyOpenShift, applySale, shiftSummary } from "@/features/ledger/lib/rules"
import { createSeed } from "@/features/sample-data/lib/seed"
import { firstShopDocuments } from "@/features/shops/lib/first-shop"
import { createLedgerStore } from "@/features/ledger/store/ledger-store"
import { LedgerStoreContext } from "@/features/ledger/store/ledger-store-provider"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"
import { CartPanel } from "@/features/pos/components/cart-panel"
import { Receipt } from "@/features/pos/components/receipt"
import { ZReportPrint } from "@/features/pos/components/z-report-print"
import { CartStoreProvider } from "@/features/pos/store/cart-store-provider"

const users = {
  admin: toSessionUser({ id: "u-admin", name: "ASIF", role: "admin" }),
  manager: toSessionUser({ id: "u-manager", name: "Bilal Ahmed", role: "manager" }),
  cashier: toSessionUser({ id: "u-cashier", name: "Hamza Ali", role: "cashier" }),
}

const seededStore = ({ openShift = false, settings = {} } = {}) => {
  const { shop, register } = firstShopDocuments()
  const counters = { shops: [{ id: shop._id, name: shop.name, code: shop.code }], registers: [{ id: register._id, shopId: register.shopId, code: register.code }] }
  let state = { ...createSeed(), ...counters, heldCarts: [], settings: { ...defaultPricingSettings(), ...settings } }
  if (openShift) state = applyOpenShift(state, { cashierId: "u-cashier", openingCash: 1000000, at: Date.now() }).state
  const store = createLedgerStore({ directory: { ...SAMPLE_TEAM } })
  store.setState({ ...state, hydrated: true })
  store.getInitialState = store.getState
  return store
}

const run = (store, reducer, input) => {
  const { state, record } = reducer(store.getState(), { at: Date.now(), ...input })
  store.setState(state)
  return record
}

const render = (store, element, prefill = []) => {
  const client = new QueryClient()
  for (const [key, data] of prefill) client.setQueryData(key, data)
  return renderToString(
    <QueryClientProvider client={client}>
      <LedgerStoreContext.Provider value={store}>{element}</LedgerStoreContext.Provider>
    </QueryClientProvider>
  )
}

const dashboardFor = (store) => {
  const state = store.getState()
  const view = dashboardView(state, { scope: "all", period: periodFor("7d"), range: "7d", staff: state.staff, shops: [{ id: "shop-shoes", name: "Velora Shoes" }], firstSaleAt: state.sales[0]?.soldAt })
  return [["dashboard", "all", "7d"], view]
}

const salesFor = (store, user) => {
  const sales = store.getState().sales.filter(({ cashierId }) => user.role !== "cashier" || cashierId === user.id)
  const filters = { range: "7d", cashier: user.role === "cashier" ? undefined : "all", q: "", shop: user.role === "admin" ? "all" : "shop-shoes" }
  return [["sales", filters, 1], { page: 1, pageSize: 25, total: sales.length, rows: sales.toReversed().slice(0, 25), refunds: [] }]
}

describe("screens render against seeded data", () => {
  test("owner: dashboard, sales, stock, history, staff, settings", () => {
    const store = seededStore()
    expect(render(store, <DashboardScreen user={users.admin} />, [dashboardFor(store)])).toContain("Best sellers")
    expect(render(store, <SalesScreen user={users.admin} />, [salesFor(store, users.admin)])).toContain("Z-reports")
    expect(render(store, <StockScreen user={users.admin} />)).toContain("Stock by size")
    expect(render(store, <MovementsScreen user={users.admin} />)).toContain("History cannot be edited")
    expect(render(store, <StaffScreen />)).toContain("Hamza Ali")
    expect(render(store, <SettingsScreen />)).toContain("Supervisor approval PIN")
  })

  test("supervisor: sales, returns, products, stock", () => {
    const store = seededStore()
    expect(render(store, <SalesScreen user={users.manager} />)).toContain("Export CSV")
    expect(render(store, <RefundsScreen user={users.manager} />)).toContain("To approve")
    expect(render(store, <ProductsScreen />)).toContain("Velora")
    expect(render(store, <StockScreen user={users.manager} />)).toContain("Receive delivery")
  })

  test("cashier: sales list and the sell screen in each state", () => {
    const closed = seededStore()
    expect(render(closed, <SalesScreen user={users.cashier} />, [salesFor(closed, users.cashier)])).toContain("SH1-R1-")
    expect(render(closed, <PosScreen user={users.cashier} />)).toContain("Open shift")

    const open = seededStore({ openShift: true })
    const html = render(open, <PosScreen user={users.cashier} />)
    expect(html).toContain("Shift since")
    expect(html).toContain("Cart is empty")

    const other = toSessionUser({ id: "u-cashier-2", name: "Second Cashier", role: "cashier" })
    expect(render(open, <PosScreen user={other} />)).toContain("is in use")
  })

  test("a sale, a refund and a new team member show up on the screens that read them", () => {
    const store = seededStore({ openShift: true })
    const state = store.getState()
    const variant = state.variants.find(({ id, active }) => active && (state.stock[id] ?? 0) > 0)
    const shift = state.shifts.at(-1)
    const sale = run(store, applySale, {
      lines: [{ variantId: variant.id, quantity: 1 }],
      payments: [{ method: "cash", amount: variant.price }],
      cashierId: "u-cashier",
      shiftId: shift.id,
    })
    store.getState().setDirectory({ ...SAMPLE_TEAM, "u-zain": { id: "u-zain", name: "Zain Malik", role: "cashier", username: "zain", shop: "Velora Shoes", disabled: true } })
    expect(render(store, <SalesScreen user={users.admin} />, [salesFor(store, users.admin)])).toContain(sale.number)
    const staffPage = render(store, <StaffScreen />)
    expect(staffPage).toContain("Zain Malik")
    expect(staffPage).toContain("Disabled")
    expect(render(store, <DashboardScreen user={users.admin} />, [dashboardFor(store)])).toContain("Zain Malik")
  })

  test("the cart, the receipt and the Z-report print carry no compliance claims and show tax", () => {
    const store = seededStore({ openShift: true, settings: { taxEnabled: true, taxRate: 15, taxLabel: "GST" } })
    const state = store.getState()
    const variant = state.variants.find(({ id, active }) => active && (state.stock[id] ?? 0) > 0)
    const shift = state.shifts.at(-1)
    const total = variant.price + Math.round((variant.price * 0.15) / 100) * 100
    const sale = run(store, applySale, { lines: [{ variantId: variant.id, quantity: 1 }], payments: [{ method: "cash", amount: total }], cashierId: "u-cashier", shiftId: shift.id, settings: store.getState().settings })
    const closed = run(store, applyCloseShift, { shiftId: shift.id, countedCash: 1000000 + total, closedBy: "u-cashier" })

    const cart = render(store, <CartStoreProvider><CartPanel availableFor={() => 5} onScan={() => {}} onCharge={() => {}} onHold={() => {}} onOpenHeld={() => {}} /></CartStoreProvider>)
    expect(cart).toContain("Current sale")
    expect(cart).toContain("Held")

    const receipt = render(store, <Receipt sale={sale} />)
    expect(receipt).toContain("NOT A TAX INVOICE")
    expect(receipt).toContain("GST (15%)")
    expect(receipt).not.toContain("FBR")

    const zReport = render(store, <ZReportPrint shift={closed} summary={shiftSummary(store.getState(), closed)} />)
    expect(zReport).toContain("TOTAL COLLECTED")
    expect(zReport).toContain("Not a tax document")
    expect(zReport).not.toContain("FBR")
  })
})
