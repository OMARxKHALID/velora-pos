import { describe, expect, test } from "bun:test"
import { indexCatalog, seedCatalog } from "@/features/catalog/lib/catalog"
import { applyExchange, applyOpenShift, applyPurchase, applyRefundDecision, applyRefundRequest, applySale, applySync, emptyLedger } from "@/features/demo/lib/ledger"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"
import { FBR_INVOICE_TYPE, FBR_PAYMENT_MODE, creditNoteInvoice, exchangeInvoices, fbrDateTime, paymentModeFor, saleInvoice, simulatedFiscalNumber, splitByWeight } from "./fbr"

const catalog = seedCatalog()
const shoe = catalog.variants[0]
const sibling = catalog.variants.find((variant) => variant.productId === shoe.productId && variant.id !== shoe.id)
const at = new Date(2026, 8, 25, 14, 30, 12).getTime()
const fbrSettings = { ...defaultPricingSettings(), taxEnabled: true, taxRate: 18, fbrEnabled: true, fbrPosId: "110014", ntn: "1234567-8" }

const sell = (settings, { offline = false, payments } = {}) => {
  const stocked = applyPurchase(
    { ...emptyLedger(), ...catalog },
    { lines: [shoe, sibling].map(({ id, cost }) => ({ variantId: id, quantity: 5, unitCost: cost })), supplier: "Test", receivedBy: "u-manager", at }
  ).state
  const { state: opened, record: shift } = applyOpenShift(stocked, { cashierId: "u-cashier", openingCash: 0, at })
  const { state, record: sale } = applySale(opened, {
    lines: [{ variantId: shoe.id, quantity: 2, discount: 0, productDiscount: 0 }],
    payments: payments ?? [{ method: "cash", amount: shoe.price * 3 }],
    cashierId: "u-cashier",
    shiftId: shift.id,
    at,
    settings,
    offline,
  })
  return { state, sale, shift }
}

const addsUp = (payload) => {
  const items = payload.Items
  expect(payload.TotalQuantity).toBe(items.reduce((sum, item) => sum + item.Quantity, 0))
  expect(payload.TotalSaleValue).toBeCloseTo(items.reduce((sum, item) => sum + item.SaleValue, 0))
  expect(payload.TotalTaxCharged).toBeCloseTo(items.reduce((sum, item) => sum + item.TaxCharged, 0))
  expect(payload.TotalBillAmount).toBeCloseTo(payload.TotalSaleValue - payload.Discount + payload.TotalTaxCharged)
  for (const item of items) expect(item.TotalAmount).toBeCloseTo(item.SaleValue - item.Discount + item.TaxCharged)
}

describe("fbr payloads", () => {
  test("small helpers: date format, payment mode, fiscal number, weighted split", () => {
    expect(fbrDateTime(at)).toBe("2026-09-25 14:30:12")
    expect(paymentModeFor(["cash"])).toBe(FBR_PAYMENT_MODE.cash)
    expect(paymentModeFor(["card"])).toBe(FBR_PAYMENT_MODE.card)
    expect(paymentModeFor(["cash", "card"])).toBe(FBR_PAYMENT_MODE.mixed)
    expect(simulatedFiscalNumber("110014", at, 7)).toBe("1100142509261430120007")
    expect(splitByWeight(1000, [1, 1, 1]).reduce((sum, part) => sum + part, 0)).toBe(1000)
  })

  test("a tax-exclusive sale reports its tax on top and adds up", () => {
    const { sale } = sell(fbrSettings)
    const payload = saleInvoice(sale)
    addsUp(payload)
    expect(payload).toMatchObject({ POSID: 110014, USIN: sale.number, InvoiceType: FBR_INVOICE_TYPE.sale, PaymentMode: FBR_PAYMENT_MODE.cash })
    expect(payload.TotalBillAmount * 100).toBe(sale.total - sale.serviceFee)
    expect(payload.Items[0].PCTCode).toMatch(/^\d{4}\.\d{4}$/)
    expect(sale.serviceFee).toBe(100)
  })

  test("a tax-inclusive sale keeps the shelf price and reports the tax inside it", () => {
    const { sale } = sell({ ...fbrSettings, pricesIncludeTax: true, fbrServiceFee: false })
    expect(sale.total).toBe(shoe.price * 2)
    expect(sale.items[0].saleValue + sale.items[0].taxCharged).toBe(shoe.price * 2)
    const payload = saleInvoice(sale)
    addsUp(payload)
    expect(payload.TotalBillAmount * 100).toBe(sale.total)
  })

  test("the sale gets a fiscal number online and waits for sync offline", () => {
    expect(sell(fbrSettings).sale.fbr).toMatchObject({ status: "reported", posId: "110014" })
    const { state, sale } = sell(fbrSettings, { offline: true })
    expect(sale.fbr).toMatchObject({ status: "pending", invoiceNumber: null })
    const synced = applySync(state, { at }).state.sales.find(({ id }) => id === sale.id)
    expect(synced.fbr.status).toBe("reported")
    expect(synced.fbr.invoiceNumber).toMatch(/^110014\d{16}$/)
  })

  test("an approved refund becomes a credit note that points at the sale", () => {
    const { state, sale, shift } = sell({ ...fbrSettings, pricesIncludeTax: true })
    const requested = applyRefundRequest(state, { saleId: sale.id, lines: [{ variantId: shoe.id, quantity: 1 }], reason: "Wrong size", method: "cash", requestedBy: "u-cashier", shiftId: shift.id, at })
    const { record: refund } = applyRefundDecision(requested.state, { refundId: requested.record.id, approve: true, userId: "u-manager", at })
    expect(refund.fbr).toMatchObject({ usin: `${sale.number}-R1`, refUsin: sale.number, invoiceType: FBR_INVOICE_TYPE.credit, status: "reported" })
    const payload = creditNoteInvoice(refund, sale)
    addsUp(payload)
    expect(payload.TotalBillAmount * 100).toBe(refund.total)
    expect(payload.RefUSIN).toBe(sale.number)
  })

  test("a size swap reports a credit note and a new invoice of the same value", () => {
    const { state, sale } = sell(fbrSettings)
    const { state: next, record: exchange } = applyExchange(state, { saleId: sale.id, fromVariantId: shoe.id, toVariantId: sibling.id, quantity: 1, userId: "u-cashier", at })
    const { credit, invoice } = exchangeInvoices(exchange, sale, indexCatalog(next).variantById)
    expect(credit.InvoiceType).toBe(FBR_INVOICE_TYPE.credit)
    expect(invoice.InvoiceType).toBe(FBR_INVOICE_TYPE.sale)
    expect(credit.TotalBillAmount).toBe(invoice.TotalBillAmount)
    expect(invoice.Items[0].ItemCode).toBe(sibling.sku)
  })

  test("selling with FBR on needs a POSID", () => {
    expect(() => sell({ ...fbrSettings, fbrPosId: "" })).toThrow("POSID")
  })
})
