"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PlusIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Segmented } from "@/components/ui/segmented"
import { createStaffSchema } from "../schemas"
import { SHOP_ID } from "@/features/catalog/lib/catalog"
import { ShopSelect } from "@/features/shops/components/shop-select"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { StaffProfileFields } from "./staff-profile-fields"

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

export const CreateStaffDialog = ({ user, pending, onClose, onCreate }) => {
  const [role, setRole] = useState("cashier")
  const [profile, setProfile] = useState({ name: "" })
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const scope = useShopScope(user)
  const [shopId, setShopId] = useState(scope === ALL_SHOPS ? SHOP_ID : scope)

  const handleSubmit = (event) => {
    event.preventDefault()
    const input = { ...profile, role, shopId, username: username || suggestUsername(profile.name), password }
    const result = createStaffSchema.safeParse(input)
    if (!result.success) return toast.error(result.error.issues[0].message)
    onCreate(input)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
          <DialogDescription>They join the shop team and sign in with the username and password you set here.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Field>
            <FieldLabel>Role</FieldLabel>
            <Segmented options={roleOptions} value={role} onChange={setRole} />
            <FieldDescription>
              {role === "cashier" ? "Cashiers process counter sales, scans and payments." : "Supervisors approve returns, manage stock and look after the shop. Set their approval PIN in Settings."}
            </FieldDescription>
          </Field>

          <ShopSelect id="staff-shop" value={shopId} onChange={setShopId} label="Works at" />

          <StaffProfileFields values={profile} onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))} autoFocus />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="staff-username">Username</FieldLabel>
              <Input
                id="staff-username"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                placeholder={suggestUsername(profile.name) || "zain"}
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
