"use client"

import { useState } from "react"
import { EyeIcon, EyeSlashIcon, PlusIcon, WarningIcon } from "@phosphor-icons/react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/shared/components/ui/input-group"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/shared/components/ui/field"
import { Segmented } from "@/shared/components/ui/segmented"
import { createStaffSchema } from "../schemas"
import { SHOP_ID } from "@/features/catalog/lib/catalog"
import { ShopSelect } from "@/features/shops/components/shop-select"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { StaffProfileFields } from "./staff-profile-fields"
import { hasFinePointer } from "@/shared/lib/pointer"

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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const scope = useShopScope(user)
  const [shopId, setShopId] = useState(scope === ALL_SHOPS ? SHOP_ID : scope)

  const handleSubmit = (event) => {
    event.preventDefault()
    const input = { ...profile, role, shopId, username: username || suggestUsername(profile.name), password }
    const result = createStaffSchema.safeParse(input)
    if (!result.success) return setError(result.error.issues[0].message)
    setError(null)
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

          <StaffProfileFields values={profile} onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))} autoFocus={hasFinePointer()} />

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
              <InputGroup>
                <InputGroupInput id="staff-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton size="icon-sm" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((shown) => !shown)}>
                    {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </div>
          <FieldDescription>At least 8 characters. Share it with them in person; they cannot see it again here.</FieldDescription>

          {error && (
            <Alert variant="destructive" role="alert">
              <WarningIcon />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" pending={pending}>
              <PlusIcon />
              Add staff member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
