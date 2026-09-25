"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PlusIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Segmented } from "@/components/ui/segmented"
import { SHOP_ID } from "@/features/catalog/lib/catalog"
import { ShopSelect } from "@/features/shops/components/shop-select"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { StaffProfileFields } from "./staff-profile-fields"

const roleOptions = [
  { key: "cashier", label: "Cashier" },
  { key: "manager", label: "Supervisor" },
]

export const CreateStaffDialog = ({ onClose, onCreate }) => {
  const [role, setRole] = useState("cashier")
  const [profile, setProfile] = useState({ name: "" })
  const scope = useShopScope()
  const [shopId, setShopId] = useState(scope === ALL_SHOPS ? SHOP_ID : scope)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!profile.name.trim()) return toast.error("Enter the staff member's full name")
    onCreate({ ...profile, role, shopId })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
          <DialogDescription>They join the shop you pick and can sign in from the start page with their role.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Field>
            <FieldLabel>Role</FieldLabel>
            <Segmented options={roleOptions} value={role} onChange={setRole} />
            <FieldDescription>
              {role === "cashier" ? "Cashiers process counter sales, scans and payments." : "Supervisors approve returns, manage stock and look after the shop."}
            </FieldDescription>
          </Field>

          <ShopSelect id="staff-shop" value={shopId} onChange={setShopId} label="Works at" />

          <StaffProfileFields values={profile} onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))} autoFocus />

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
