import { roundToRupee, sumBy } from "@/lib/money"

export const FBR_INVOICE_TYPE = { sale: 1, debit: 2, credit: 3 }

export const FBR_PAYMENT_MODE = { cash: 1, card: 2, mixed: 5 }

export const POSID_PATTERN = /^\d{6}$/

export const NTN_PATTERN = /^\d{7}-?\d$/

export const STRN_PATTERN = /^\d{13}$/

export const FBR_ENDPOINTS = {
  sandbox: "https://esp.fbr.gov.pk:8244/FBR/v1/api/Live/PostData",
  production: "https://gw.fbr.gov.pk/imsp/v1/api/Live/PostData",
}

const pad = (value, size = 2) => String(value).padStart(size, "0")

const rupees = (paisa) => paisa / 100

export const fbrDateTime = (at) => {
  const date = new Date(at)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export const simulatedFiscalNumber = (posId, at, sequence) => {
  const date = new Date(at)
  const stamp = [date.getDate(), date.getMonth() + 1, date.getFullYear() % 100, date.getHours(), date.getMinutes(), date.getSeconds()].map((part) => pad(part)).join("")
  return `${posId}${stamp}${pad(sequence % 10000, 4)}`
}

export const paymentModeFor = (methods) => {
  const kinds = [...new Set(methods)]
  if (kinds.length > 1) return FBR_PAYMENT_MODE.mixed
  return FBR_PAYMENT_MODE[kinds[0]] ?? FBR_PAYMENT_MODE.card
}

export const splitByWeight = (total, weights) => {
  const whole = sumBy(weights, (weight) => weight)
  let left = total
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return left
    const part = whole ? roundToRupee((total * weight) / whole) : 0
    left -= part
    return part
  })
}

const invoice = ({ posId, usin, at, buyerName, buyerPhone, methods, invoiceType, refUsin = null, lines }) => {
  const Items = lines.map(({ sku, name, pctCode, quantity, taxRate, saleValue, discount, taxCharged }) => ({
    ItemCode: sku,
    ItemName: name,
    PCTCode: pctCode ?? "",
    Quantity: quantity,
    TaxRate: taxRate,
    SaleValue: rupees(saleValue + discount),
    Discount: rupees(discount),
    TaxCharged: rupees(taxCharged),
    FurtherTax: 0,
    TotalAmount: rupees(saleValue + taxCharged),
    InvoiceType: invoiceType,
    RefUSIN: refUsin,
  }))

  return {
    InvoiceNumber: "",
    POSID: Number(posId),
    USIN: usin,
    DateTime: fbrDateTime(at),
    BuyerName: buyerName ?? "",
    BuyerPhoneNumber: buyerPhone ?? "",
    TotalBillAmount: rupees(sumBy(lines, ({ saleValue, taxCharged }) => saleValue + taxCharged)),
    TotalQuantity: sumBy(lines, ({ quantity }) => quantity),
    TotalSaleValue: rupees(sumBy(lines, ({ saleValue, discount }) => saleValue + discount)),
    TotalTaxCharged: rupees(sumBy(lines, ({ taxCharged }) => taxCharged)),
    Discount: rupees(sumBy(lines, ({ discount }) => discount)),
    FurtherTax: 0,
    PaymentMode: paymentModeFor(methods),
    RefUSIN: refUsin,
    InvoiceType: invoiceType,
    Items,
  }
}

const saleLine = (sale, item) => ({
  sku: item.sku,
  name: item.productName,
  pctCode: item.pctCode,
  quantity: item.quantity,
  taxRate: sale.taxRate ?? 0,
  saleValue: item.saleValue ?? item.total,
  discount: item.discount + item.productDiscount,
  taxCharged: item.taxCharged ?? 0,
})

export const saleInvoice = (sale) =>
  invoice({
    posId: sale.fbr.posId,
    usin: sale.number,
    at: sale.soldAt,
    buyerName: sale.customerName,
    buyerPhone: sale.customerPhone,
    methods: sale.payments.map(({ method }) => method),
    invoiceType: FBR_INVOICE_TYPE.sale,
    lines: sale.items.map((item) => saleLine(sale, item)),
  })

export const creditNoteInvoice = (refund, sale) => {
  const taxes = splitByWeight(refund.taxTotal ?? 0, refund.items.map(({ amount }) => amount))
  return invoice({
    posId: refund.fbr.posId,
    usin: refund.fbr.usin,
    at: refund.decidedAt,
    buyerName: sale.customerName,
    buyerPhone: sale.customerPhone,
    methods: [refund.method],
    invoiceType: FBR_INVOICE_TYPE.credit,
    refUsin: sale.number,
    lines: refund.items.map(({ variantId, quantity, amount }, index) => {
      const item = sale.items.find((saleItem) => saleItem.variantId === variantId)
      return {
        sku: item.sku,
        name: item.productName,
        pctCode: item.pctCode,
        quantity,
        taxRate: sale.taxRate ?? 0,
        saleValue: sale.taxInclusive ? amount - taxes[index] : amount,
        discount: 0,
        taxCharged: taxes[index],
      }
    }),
  })
}

export const exchangeInvoices = (exchange, sale, variantById) => {
  const item = sale.items.find(({ variantId }) => variantId === exchange.fromVariantId)
  const value = roundToRupee((item.total / item.quantity) * exchange.quantity)
  const taxCharged = roundToRupee(((item.taxCharged ?? 0) / item.quantity) * exchange.quantity)
  const base = {
    name: item.productName,
    pctCode: item.pctCode,
    quantity: exchange.quantity,
    taxRate: sale.taxRate ?? 0,
    saleValue: sale.taxInclusive ? value - taxCharged : value,
    discount: 0,
    taxCharged,
  }
  const shared = {
    posId: exchange.fbr.credit.posId,
    at: exchange.createdAt,
    buyerName: sale.customerName,
    buyerPhone: sale.customerPhone,
    methods: sale.payments.map(({ method }) => method),
  }
  return {
    credit: invoice({ ...shared, usin: exchange.fbr.credit.usin, invoiceType: FBR_INVOICE_TYPE.credit, refUsin: sale.number, lines: [{ ...base, sku: item.sku }] }),
    invoice: invoice({
      ...shared,
      usin: exchange.fbr.invoice.usin,
      invoiceType: FBR_INVOICE_TYPE.sale,
      refUsin: sale.number,
      lines: [{ ...base, sku: variantById[exchange.toVariantId]?.sku ?? item.sku }],
    }),
  }
}
