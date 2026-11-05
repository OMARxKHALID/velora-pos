"use client"

import { useState } from "react"
import { AirplaneTiltIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { localDate } from "@/features/staff/lib/people"

export const LeaveDialog = ({ person, onClose, onSave }) => {
  const [leave, setLeave] = useState({ from: person.leave?.from ?? localDate(), until: person.leave?.until ?? "", note: person.leave?.note ?? "" })
  const change = (patch) => setLeave((current) => ({ ...current, ...patch }))

  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    await onSave(person, leave)
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Leave for {person.name}</DialogTitle>
            <DialogDescription>While on leave they cannot sign in{person.role === "manager" ? " or approve discounts and returns" : ""}. Leave ends by itself after the last day.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="leave-from">First day</FieldLabel>
              <Input id="leave-from" type="date" value={leave.from} onChange={(event) => change({ from: event.target.value })} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="leave-until">Last day</FieldLabel>
              <Input id="leave-until" type="date" value={leave.until} min={leave.from} onChange={(event) => change({ until: event.target.value })} />
            </Field>
          </div>
          <FieldDescription>Leave the last day empty if the return date is not known yet.</FieldDescription>
          <Field>
            <FieldLabel htmlFor="leave-note">Note (optional)</FieldLabel>
            <Input id="leave-note" value={leave.note} onChange={(event) => change({ note: event.target.value })} placeholder="e.g. Annual leave, sick leave" maxLength={120} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" pending={saving}>
              <AirplaneTiltIcon />
              Save leave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
