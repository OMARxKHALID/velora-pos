"use client"

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/ui/segmented"
import { Textarea } from "@/components/ui/textarea"
import { Panel } from "@/features/analytics/components/panel"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { Receipt } from "@/features/pos/components/receipt"
import { receiptDefaults, receiptDesign } from "@/features/pos/lib/receipt-design"
import { SettingToggle } from "./setting-toggle"

const papers = [
  { key: "80", label: "80 mm" },
  { key: "58", label: "58 mm" },
]

const textFields = [["title", "Brand at the top", "VELORA", 24]]

const toggles = [
  ["showCashier", "Cashier name"],
  ["showCustomer", "Customer name and phone"],
  ["showBarcode", "Receipt barcode for returns"],
]

export const ReceiptDesigner = ({ settings, update, shopId = null, scopeBar = null }) => {
  const sample = useLedgerStore(({ sales }) => (shopId ? sales.findLast((sale) => sale.shopId === shopId) : sales.at(-1)))
  const design = receiptDesign(settings)

  const change = (patch) => update({ receipt: { ...design, ...patch } })

  return (
    <div className="grid items-start gap-4 @4xl:grid-cols-[minmax(0,1fr)_auto]">
      {scopeBar}
      <Panel
        title="Receipt design"
        description="What every printed receipt shows. Changes apply to new prints and reprints straight away."
        action={
          <Button type="button" size="sm" variant="ghost" onClick={() => update({ receipt: receiptDefaults })}>
            <ArrowCounterClockwiseIcon />
            Default
          </Button>
        }
      >
        <div className="space-y-5 p-4">
          <Field>
            <FieldLabel>Paper width</FieldLabel>
            <Segmented label="Paper width" options={papers} value={design.paper} onChange={(paper) => change({ paper })} />
            <FieldDescription>Match the roll in the receipt printer.</FieldDescription>
          </Field>

          <div className="grid gap-4 @lg:grid-cols-2">
            {textFields.map(([key, label, placeholder, max]) => (
              <Field key={key}>
                <FieldLabel htmlFor={`receipt-${key}`}>{label}</FieldLabel>
                <Input id={`receipt-${key}`} value={design[key]} onChange={(event) => change({ [key]: event.target.value.slice(0, max) })} placeholder={placeholder} />
              </Field>
            ))}
          </div>

          <FieldDescription>The shop name, address and phone under the brand come from each shop in the Shops tab.</FieldDescription>

          <div className="grid gap-4 @lg:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="receipt-policy">Return policy</FieldLabel>
              <Textarea id="receipt-policy" rows={2} value={design.policy} onChange={(event) => change({ policy: event.target.value.slice(0, 160) })} placeholder="Exchange within 7 days with this receipt" />
            </Field>
            <Field>
              <FieldLabel htmlFor="receipt-footer">Closing message</FieldLabel>
              <Textarea id="receipt-footer" rows={2} value={design.footer} onChange={(event) => change({ footer: event.target.value.slice(0, 120) })} placeholder="Thank you for shopping with us" />
            </Field>
          </div>

          <div className="space-y-4 border-t pt-4">
            {toggles.map(([key, label]) => (
              <SettingToggle key={key} on={design[key]} onChange={(value) => change({ [key]: value })} label={label} />
            ))}
          </div>

          <FieldDescription>Tax lines, the FBR number, QR code, NTN and STRN are always printed when they apply, because the law asks for them.</FieldDescription>
        </div>
      </Panel>

      <div className="space-y-2 @4xl:sticky @4xl:top-20">
        <p className="text-xs font-medium text-muted-foreground">Preview</p>
        <div className="overflow-x-auto border bg-muted/40 p-4">
          {sample ? <Receipt sale={sample} design={design} /> : <p className="w-[302px] py-12 text-center text-sm text-muted-foreground">Make a sale to see a preview.</p>}
        </div>
      </div>
    </div>
  )
}
