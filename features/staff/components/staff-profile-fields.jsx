"use client"

import { useRef } from "react"
import { toast } from "sonner"
import { CameraIcon, TrashIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { photoFromFile } from "../lib/photo"
import { StaffAvatar } from "./staff-avatar"

const fields = [
  ["phone", "Phone (optional)", "tel", "0300 1234567"],
  ["email", "Email (optional)", "email", "zain@velora.pk"],
  ["cnic", "CNIC (optional)", "text", "35202-1234567-1"],
  ["city", "City (optional)", "text", "Lahore"],
  ["emergencyContact", "Emergency contact (optional)", "tel", "0321 7654321"],
]

export const StaffProfileFields = ({ values, onChange, autoFocus = false }) => {
  const fileInput = useRef(null)

  const handlePhoto = async (event) => {
    const [file] = event.target.files
    event.target.value = ""
    if (!file) return
    try {
      onChange({ photo: await photoFromFile(file) })
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <StaffAvatar person={{ ...values, avatar: null }} size="lg" className="size-14" fallbackClassName="text-base font-bold" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
            <CameraIcon />
            {values.photo ? "Change photo" : "Add photo"}
          </Button>
          {values.photo && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ photo: null })}>
              <TrashIcon />
              Remove
            </Button>
          )}
        </div>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
      </div>

      <Field>
        <FieldLabel htmlFor="staff-name">Full name</FieldLabel>
        <Input id="staff-name" value={values.name ?? ""} onChange={(event) => onChange({ name: event.target.value })} placeholder="e.g. Zain Malik" autoComplete="off" autoFocus={autoFocus} required />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map(([key, label, type, placeholder]) => (
          <Field key={key}>
            <FieldLabel htmlFor={`staff-${key}`}>{label}</FieldLabel>
            <Input
              id={`staff-${key}`}
              type={type}
              inputMode={key === "cnic" ? "numeric" : undefined}
              value={values[key] ?? ""}
              onChange={(event) => onChange({ [key]: event.target.value })}
              placeholder={placeholder}
              autoComplete="off"
            />
          </Field>
        ))}
      </div>

      <Field>
        <FieldLabel htmlFor="staff-address">Address (optional)</FieldLabel>
        <Textarea id="staff-address" rows={2} value={values.address ?? ""} onChange={(event) => onChange({ address: event.target.value })} placeholder="House, street, area" />
      </Field>
    </div>
  )
}
