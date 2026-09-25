"use client"

import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { creditNoteInvoice, exchangeInvoices, saleInvoice } from "../lib/fbr"

const FbrDocument = ({ title, fbr, payload }) => (
  <li className="space-y-1 p-3 text-sm">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span className="font-medium">{title}</span>
      {fbr.invoiceNumber ? (
        <span className="font-mono text-xs break-all text-gold">{fbr.invoiceNumber}</span>
      ) : (
        <span className="text-xs text-warning">Waiting to report</span>
      )}
    </div>
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer py-1 hover:text-foreground pointer-coarse:py-2">Data sent to FBR</summary>
      <pre className="mt-1 max-h-64 overflow-auto bg-muted/50 p-2 font-mono text-[11px] leading-snug">{JSON.stringify(payload, null, 2)}</pre>
    </details>
  </li>
)

export const FbrSection = ({ sale, refunds, exchanges }) => {
  const { variantById } = useCatalog()
  if (!sale.fbr) return null

  const documents = [
    { key: sale.id, title: `Sale · ${sale.number}`, fbr: sale.fbr, payload: saleInvoice(sale) },
    ...refunds
      .filter(({ fbr }) => fbr)
      .map((refund) => ({ key: refund.id, title: `Credit note · ${refund.fbr.usin}`, fbr: refund.fbr, payload: creditNoteInvoice(refund, sale) })),
    ...exchanges
      .filter(({ fbr }) => fbr)
      .flatMap((exchange) => {
        const { credit, invoice } = exchangeInvoices(exchange, sale, variantById)
        return [
          { key: `${exchange.id}-credit`, title: `Exchange credit · ${exchange.fbr.credit.usin}`, fbr: exchange.fbr.credit, payload: credit },
          { key: `${exchange.id}-invoice`, title: `Exchange invoice · ${exchange.fbr.invoice.usin}`, fbr: exchange.fbr.invoice, payload: invoice },
        ]
      }),
  ]

  return (
    <div className="space-y-2">
      <h3 className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">FBR</h3>
      <ul className="divide-y border">
        {documents.map(({ key, ...document }) => (
          <FbrDocument key={key} {...document} />
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Simulated in the demo. In the live build this data is posted to FBR and the number comes back from FBR.</p>
    </div>
  )
}
