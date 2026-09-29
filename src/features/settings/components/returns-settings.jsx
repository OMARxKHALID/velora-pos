"use client"

import { useState } from "react"
import { PlusIcon, XIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { Panel } from "@/shared/components/ui/panel"
import { Separator } from "@/shared/components/ui/separator"
import { Segmented } from "@/shared/components/ui/segmented"
import { RETURN_WINDOWS } from "@/features/ledger/lib/rules"
import { MAX_RETURN_REASONS, defaultPricingSettings } from "@/features/pricing/lib/pricing"
import { SettingToggle } from "./setting-toggle"

const windowOptions = RETURN_WINDOWS.map((days) => ({ key: String(days), label: days ? String(days) : "Off" }))

const windowMessage = (days) => (days ? `Returns and exchanges now close ${days} ${days === 1 ? "day" : "days"} after a sale` : "Returns and exchanges have no time limit")

const reasonProblem = (reasons) => {
  const cleaned = reasons.map((reason) => reason.trim())
  if (cleaned.some((reason) => reason.length < 2)) return "Each reason needs a few letters"
  if (new Set(cleaned.map((reason) => reason.toLowerCase())).size !== cleaned.length) return "Each reason must be different"
  return null
}

const ReasonsEditor = ({ saved, update }) => {
  const [previous, setPrevious] = useState(saved)
  const [draft, setDraft] = useState(saved)
  if (saved !== previous) {
    setPrevious(saved)
    setDraft(saved)
  }
  const problem = reasonProblem(draft)
  const changed = JSON.stringify(draft.map((reason) => reason.trim())) !== JSON.stringify(saved)

  const handleEdit = (index, value) => setDraft((current) => current.map((reason, at) => (at === index ? value.slice(0, 40) : reason)))
  const handleRemove = (index) => setDraft((current) => current.filter((_, at) => at !== index))
  const handleAdd = () => setDraft((current) => [...current, ""])
  const handleSave = () => update({ returnReasons: draft.map((reason) => reason.trim()) }, "Return reasons saved")
  const handleReset = () => setDraft(saved)

  return (
    <Field data-invalid={Boolean(problem)}>
      <FieldLabel>Reasons the cashier picks from</FieldLabel>
      <ul className="space-y-2">
        {draft.map((reason, index) => (
          <li key={index} className="flex items-center gap-2">
            <Input value={reason} onChange={(event) => handleEdit(index, event.target.value)} aria-label={`Reason ${index + 1}`} placeholder="e.g. Wrong size" />
            <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove ${reason || `reason ${index + 1}`}`} onClick={() => handleRemove(index)}>
              <XIcon />
            </Button>
          </li>
        ))}
      </ul>
      {problem && <FieldError errors={[{ message: problem }]} />}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={draft.length >= MAX_RETURN_REASONS} onClick={handleAdd}>
          <PlusIcon />
          Add reason
        </Button>
        {changed && (
          <>
            <Button type="button" size="sm" disabled={Boolean(problem)} onClick={handleSave}>
              Save reasons
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleReset}>
              Undo changes
            </Button>
          </>
        )}
      </div>
      <FieldDescription>&quot;Other&quot; is always offered and asks the cashier to describe the reason. Up to {MAX_RETURN_REASONS} reasons.</FieldDescription>
    </Field>
  )
}

export const ReturnsSettings = ({ settings, update }) => (
  <Panel title="Returns and exchanges" description="How long customers can bring items back, and what the cashier records.">
    <div className="space-y-5 p-4">
      <Field>
        <FieldLabel>Time limit (days)</FieldLabel>
        <Segmented
          label="Return time limit"
          options={windowOptions}
          value={String(settings.returnWindowDays ?? 7)}
          onChange={(value) => update({ returnWindowDays: Number(value) }, windowMessage(Number(value)))}
        />
        <FieldDescription>
          Counted from the minute of the sale. After it, the Return and Exchange buttons are turned off and the server refuses late requests. The last day is printed on every
          receipt. Returns already waiting for approval are not affected.
        </FieldDescription>
      </Field>
      <Separator />
      <SettingToggle
        on={settings.restockReturns !== false}
        onChange={(restockReturns) => update({ restockReturns }, restockReturns ? "Returned items go back in stock by default" : "Returned items stay out of stock by default")}
        label="Put returned items back in stock"
        description="The starting choice on each returned item. The cashier can still change it, for example for damaged shoes."
      />
      <Separator />
      <ReasonsEditor saved={settings.returnReasons ?? defaultPricingSettings().returnReasons} update={update} />
    </div>
  </Panel>
)
