"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PlusIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/ui/segmented"
import { createStaffSchema } from "../schemas"

const roleOptions = [
  { key: "cashier", label: "Cashier" },
  { key: "manager", label: "Supervisor" },
]

const suggestUsername = (name) =>
  name
    .trim()
    .toLowerCase()
    .split(/\s+/)[0]
    ?.replace(/[^a-z0-9._-]/g, "") ?? ""

export const CreateStaffDialog = ({ pending, onClose, onCreate }) => {
  const [name, setName] = useState("")
  const [role, setRole] = useState("cashier")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const handleSubmit = (event) => {
    event.preventDefault()
    const input = { name, role, username: username || suggestUsername(name), password, email, phone }
    const result = createStaffSchema.safeParse(input)
    if (!result.success) return toast.error(result.error.issues[0].message)
    onCreate(input)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
          <DialogDescription>They join the shop team and sign in with the username and password you set here.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Field>
            <FieldLabel htmlFor="staff-name">Full name</FieldLabel>
            <Input id="staff-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Zain Malik" autoComplete="off" autoFocus required />
          </Field>

          <Field>
            <FieldLabel>Role</FieldLabel>
            <Segmented options={roleOptions} value={role} onChange={setRole} />
            <FieldDescription>
              {role === "cashier" ? "Cashiers process counter sales, scans and payments." : "Supervisors approve returns, manage stock and look after the shop. Set their approval PIN in Settings."}
            </FieldDescription>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="staff-username">Username</FieldLabel>
              <Input
                id="staff-username"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                placeholder={suggestUsername(name) || "zain"}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-password">Password</FieldLabel>
              <Input id="staff-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
            </Field>
          </div>
          <FieldDescription>At least 8 characters. Share it with them in person; they cannot see it again here.</FieldDescription>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="staff-email">Work email (optional)</FieldLabel>
              <Input id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="zain@velora.pk" />
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-phone">Phone (optional)</FieldLabel>
              <Input id="staff-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0300 1234567" />
            </Field>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              <PlusIcon />
              {pending ? "Adding…" : "Add staff member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
