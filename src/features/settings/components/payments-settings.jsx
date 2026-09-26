"use client"

import { Field, FieldDescription, FieldLabel } from "@/shared/components/ui/field"
import { Segmented } from "@/shared/components/ui/segmented"
import { Panel } from "@/features/analytics/components/panel"
import { METHOD_LABELS } from "@/features/pos/lib/payment-methods"
import { SettingToggle } from "./setting-toggle"

const methodHints = {
  card: "Debit and credit cards on the bank terminal. The approval code is optional.",
  jazzcash: "Customer pays to the shop's JazzCash account. The transaction ID is required.",
  easypaisa: "Customer pays to the shop's Easypaisa account. The transaction ID is required.",
  bank: "Direct transfer or Raast to the shop's bank account. The transaction ID is required.",
}

const roundingOptions = [
  { key: "1", label: "Off" },
  { key: "5", label: "Rs 5" },
  { key: "10", label: "Rs 10" },
]

export const PaymentsSettings = ({ settings, update, scopeBar }) => {
  const methods = { card: true, jazzcash: false, easypaisa: false, bank: false, ...settings.paymentMethods }

  const handleMethod = (method, on) => {
    update({ paymentMethods: { ...methods, [method]: on } }, `${METHOD_LABELS[method]} ${on ? "turned on" : "turned off"}`)
  }

  return (
    <div className="grid items-start gap-4 @4xl:grid-cols-2">
      {scopeBar}
      <Panel title="Ways to pay" description="Cash is always on. Pick which other payments the counter takes.">
        <div className="space-y-5 p-4">
          {Object.keys(methodHints).map((method) => (
            <SettingToggle key={method} on={methods[method]} onChange={(on) => handleMethod(method, on)} label={METHOD_LABELS[method]} description={methodHints[method]} />
          ))}
          <FieldDescription>Refunds always go back the way the customer paid.</FieldDescription>
        </div>
      </Panel>

      <Panel title="Cash rounding" description="Save hunting for coins on cash sales.">
        <div className="space-y-4 p-4">
          <Field>
            <FieldLabel>Round cash totals down to</FieldLabel>
            <Segmented label="Cash rounding" options={roundingOptions} value={String(settings.cashRounding ?? 1)} onChange={(value) => update({ cashRounding: Number(value) })} />
            <FieldDescription>
              Only when the whole sale is paid in cash, and always in the customer&apos;s favour. The rounding is saved on the sale, shown on the receipt and on the Z-report, and taken
              off sales, not tax.
            </FieldDescription>
          </Field>
        </div>
      </Panel>
    </div>
  )
}
