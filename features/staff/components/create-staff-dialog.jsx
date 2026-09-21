"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PlusIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/ui/segmented"
import { SHOP_NAME } from "@/features/auth/lib/demo-users"

const roleOptions = [
  { key: "cashier", label: "Cashier" },
  { key: "manager", label: "Supervisor" },
]

export const CreateStaffDialog = ({ onClose, onCreate }) => {
  const [name, setName] = useState("")
  const [role, setRole] = useState("cashier")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!name.trim()) return toast.error("Enter the staff member's full name")
    onCreate({ name, role, email, phone })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
          <DialogDescription>They join the {SHOP_NAME} team and can sign in from the start page with their role.</DialogDescription>
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
              {role === "cashier" ? "Cashiers process counter sales, scans and payments." : "Supervisors approve returns, manage stock and look after the shop."}
            </FieldDescription>
          </Field>

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
            <Button type="submit">
              <PlusIcon />
              Add staff member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
