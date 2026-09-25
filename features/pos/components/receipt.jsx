"use client"

import { useEffect, useRef } from "react"
import JsBarcode from "jsbarcode"
import { SHOP_NAME } from "@/features/shops/lib/constants"
import { useStaffName } from "@/features/demo/hooks/use-directory"
import { formatMoney } from "@/lib/money"

const when = new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" })

const Row = ({ label, value, strong }) => (
  <div className={strong ? "flex justify-between gap-2 text-sm font-bold" : "flex justify-between gap-2"}>
    <span className="shrink-0">{label}</span>
    <span className="truncate text-right">{value}</span>
  </div>
)

const Rule = () => <div className="my-3 border-t border-dashed border-black" />

export const Receipt = ({ sale, ref }) => {
  const barcode = useRef(null)
  const nameOf = useStaffName()

  useEffect(() => {
    JsBarcode(barcode.current, sale.number, { format: "CODE128", height: 42, width: 1.4, fontSize: 11, margin: 0, displayValue: true })
  }, [sale.number])

  return (
    <div ref={ref} className="mx-auto w-[302px] bg-white px-4 py-5 font-mono text-[11px] leading-relaxed text-black">
      <div className="text-center">
        <p className="font-heading text-xl font-bold tracking-[0.3em]">VELORA</p>
        <p className="text-[9px] tracking-[0.4em] uppercase">{SHOP_NAME}</p>
        <p className="mt-2">Counter {sale.number.split("-").slice(0, 2).join("-")}</p>
      </div>
      <Rule />
      <Row label="Receipt" value={sale.number} />
      <Row label="Date" value={when.format(new Date(sale.soldAt))} />
      <Row label="Cashier" value={nameOf(sale.cashierId)} />
      {sale.customerName && <Row label="Customer" value={sale.customerName} />}
      {sale.customerPhone && <Row label="Phone" value={sale.customerPhone} />}
      <Rule />
      <div className="space-y-2">
        {sale.items.map((item) => (
          <div key={item.variantId}>
            <p className="font-bold">{item.productName}</p>
            <Row label={`${item.attributes.color} / EU ${item.attributes.size}  ${item.quantity} × ${formatMoney(item.unitPrice)}`} value={formatMoney(item.unitPrice * item.quantity)} />
            {item.productDiscount > 0 && <Row label="  Offer" value={`-${formatMoney(item.productDiscount)}`} />}
            {item.discount > 0 && <Row label="  Discount" value={`-${formatMoney(item.discount)}`} />}
          </div>
        ))}
      </div>
      <Rule />
      <Row label="Subtotal" value={formatMoney(sale.subtotal)} />
      {sale.discountTotal > 0 && <Row label="Discount" value={`-${formatMoney(sale.discountTotal)}`} />}
      {sale.taxTotal > 0 && <Row label={sale.taxRate ? `${sale.taxLabel || "Tax"} (${sale.taxRate}%)` : sale.taxLabel || "Tax"} value={formatMoney(sale.taxTotal)} />}
      <Row label="TOTAL" value={formatMoney(sale.total)} strong />
      <Rule />
      {sale.payments.map((payment, index) => (
        <Row
          key={`${payment.method}-${index}`}
          label={`Paid · ${payment.method === "card" ? "Card" : "Cash"}${payment.reference ? ` (${payment.reference})` : ""}`}
          value={formatMoney(payment.amount)}
        />
      ))}
      {sale.change > 0 && <Row label="Change" value={formatMoney(sale.change)} />}
      <Rule />
      {!sale.syncedAt && <p className="text-center text-[10px] font-bold">SAVED OFFLINE · SYNCS AUTOMATICALLY</p>}
      <p className="text-center text-[10px]">DEMO RECEIPT · NOT A TAX INVOICE</p>
      <div className="mt-3 flex justify-center">
        <svg ref={barcode} />
      </div>
      <p className="mt-3 text-center">Thank you for shopping at Velora</p>
    </div>
  )
}
