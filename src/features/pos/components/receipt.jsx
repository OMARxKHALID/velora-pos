"use client"

import { useEffect, useRef } from "react"
import JsBarcode from "jsbarcode"
import { QRCodeSVG } from "qrcode.react"
import { cn } from "cn"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { useSettingsFor, useShop } from "@/features/shops/hooks/use-shop-scope"
import { receiptDesign } from "../lib/receipt-design"
import { formatMoney } from "@/shared/lib/money"
import { sizeLabel } from "@/features/catalog/lib/catalog"
import { methodLabel } from "../lib/payment-methods"
import { PrintRow, PrintRule } from "./print-parts"

const when = new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" })

const taxName = (sale) => (sale.taxRate ? `${sale.taxLabel || "Tax"} (${sale.taxRate}%)` : sale.taxLabel || "Tax")

const FbrBlock = ({ fbr }) =>
  fbr.invoiceNumber ? (
    <div className="flex items-center gap-3">
      <QRCodeSVG value={fbr.invoiceNumber} size={84} marginSize={0} />
      <div className="min-w-0 space-y-1">
        <p className="inline-block border border-black px-1.5 text-[10px] font-bold tracking-widest">FBR POS</p>
        <p className="text-[10px]">FBR invoice #</p>
        <p className="font-bold break-all">{fbr.invoiceNumber}</p>
        <p className="text-[9px]">Scan to verify with FBR</p>
      </div>
    </div>
  ) : (
    <p className="text-center text-[10px] font-bold">FBR INVOICE PENDING · REPORTED WHEN ONLINE</p>
  )

export const Receipt = ({ sale, ref, design: previewDesign = null }) => {
  const barcode = useRef(null)
  const nameOf = useStaffName()
  const shopDesign = receiptDesign({ receipt: useSettingsFor(sale.shopId).receipt })
  const design = previewDesign ?? shopDesign
  const shop = useShop(sale.shopId)

  useEffect(() => {
    if (design.showBarcode) JsBarcode(barcode.current, sale.number, { format: "CODE128", height: 42, width: design.paper === "58" ? 1 : 1.4, fontSize: 11, margin: 0, displayValue: true })
  }, [sale.number, design.showBarcode, design.paper])

  return (
    <div ref={ref} className={cn("mx-auto bg-white py-5 font-mono leading-relaxed text-black", design.paper === "58" ? "w-[219px] px-2 text-[10px]" : "w-[302px] px-4 text-[11px]")}>
      <div className="text-center">
        {design.title && <p className="font-heading text-xl font-bold tracking-[0.3em] break-words">{design.title}</p>}
        {shop?.name && <p className="text-[9px] tracking-[0.4em] uppercase">{shop.name}</p>}
        {shop?.address && <p className="mt-1 whitespace-pre-line">{[shop.address, shop.city].filter(Boolean).join(", ")}</p>}
        {shop?.phone && <p>{`Tel ${shop.phone}`}</p>}
        <p className="mt-2">Counter {sale.number.split("-").slice(0, 2).join("-")}</p>
        {sale.fbr?.ntn && <p>{`NTN ${sale.fbr.ntn}`}</p>}
        {sale.fbr?.strn && <p>{`STRN ${sale.fbr.strn}`}</p>}
      </div>
      <PrintRule className="my-3" />
      <PrintRow label="Receipt" value={sale.number} />
      <PrintRow label="Date" value={when.format(new Date(sale.soldAt))} />
      {design.showCashier && <PrintRow label="Cashier" value={nameOf(sale.cashierId)} />}
      {design.showCustomer && sale.customerName && <PrintRow label="Customer" value={sale.customerName} />}
      {design.showCustomer && sale.customerPhone && <PrintRow label="Phone" value={sale.customerPhone} />}
      <PrintRule className="my-3" />
      <div className="space-y-2">
        {sale.items.map((item) => (
          <div key={item.variantId}>
            <p className="font-bold">{item.productName}</p>
            <p>{`${item.attributes.color} / ${sizeLabel(item.attributes.size)}`}</p>
            <PrintRow label={`${item.quantity} × ${formatMoney(item.unitPrice)}`} value={formatMoney(item.unitPrice * item.quantity)} />
            {item.productDiscount > 0 && <PrintRow label="  Offer" value={`-${formatMoney(item.productDiscount)}`} />}
            {item.discount > 0 && <PrintRow label="  Discount" value={`-${formatMoney(item.discount)}`} />}
          </div>
        ))}
      </div>
      <PrintRule className="my-3" />
      <PrintRow label="Subtotal" value={formatMoney(sale.subtotal)} />
      {sale.discountTotal > 0 && <PrintRow label="Discount" value={`-${formatMoney(sale.discountTotal)}`} />}
      {sale.taxTotal > 0 && !sale.taxInclusive && <PrintRow label={taxName(sale)} value={formatMoney(sale.taxTotal)} />}
      {sale.serviceFee > 0 && <PrintRow label="FBR POS fee" value={formatMoney(sale.serviceFee)} />}
      <PrintRow label="TOTAL" value={formatMoney(sale.total)} strong />
      {sale.cashRounding < 0 && <PrintRow label="Cash rounding" value={`-${formatMoney(-sale.cashRounding)}`} />}
      {sale.cashRounding < 0 && <PrintRow label="CASH DUE" value={formatMoney(sale.total + sale.cashRounding)} strong />}
      {sale.taxTotal > 0 && sale.taxInclusive && <PrintRow label={`Incl. ${taxName(sale)}`} value={formatMoney(sale.taxTotal)} />}
      <PrintRule className="my-3" />
      {sale.payments.map((payment, index) => (
        <PrintRow
          key={`${payment.method}-${index}`}
          label={`Paid · ${methodLabel(payment.method)}${payment.reference ? ` (${payment.reference})` : ""}`}
          value={formatMoney(payment.amount)}
        />
      ))}
      {sale.change > 0 && <PrintRow label="Change" value={formatMoney(sale.change)} />}
      <PrintRule className="my-3" />
      {sale.fbr && (
        <>
          <FbrBlock fbr={sale.fbr} />
          <PrintRule className="my-3" />
        </>
      )}
      {!sale.syncedAt && <p className="text-center text-[10px] font-bold">SAVED OFFLINE · SYNCS AUTOMATICALLY</p>}
      {!sale.fbr && <p className="text-center text-[10px]">NOT A TAX INVOICE</p>}
      {sale.fbr && <p className="text-center text-[10px]">FBR NUMBER IS SIMULATED</p>}
      {design.showBarcode && (
        <div className="mt-3 flex justify-center">
          <svg ref={barcode} />
        </div>
      )}
      {design.policy && <p className="mt-3 text-center text-[10px] whitespace-pre-line">{design.policy}</p>}
      {design.footer && <p className="mt-3 text-center whitespace-pre-line">{design.footer}</p>}
    </div>
  )
}
