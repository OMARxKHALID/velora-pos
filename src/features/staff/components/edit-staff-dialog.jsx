"use client"

import { useState } from "react"
import { FloppyDiskIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { ShopSelect } from "@/features/shops/components/shop-select"
import { staffShopId } from "@/features/shops/lib/shops"
import { StaffProfileFields } from "./staff-profile-fields"

const editable = ["name", "phone", "email", "cnic", "city", "emergencyContact", "address", "photo"]

export const EditStaffDialog = ({ person, onClose, onSave }) => {
  const [profile, setProfile] = useState(() => ({
    ...Object.fromEntries(editable.map((key) => [key, person[key] === "—" ? "" : (person[key] ?? "")])),
    shopId: staffShopId(person),
  }))

  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    const { photo, ...rest } = profile
    await onSave(person.id, photo === (person.photo ?? "") ? rest : profile)
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Everything except the name is optional. Old sales keep showing the name they were made under.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {person.role !== "admin" && <ShopSelect id="edit-shop" value={profile.shopId} onChange={(shopId) => setProfile((current) => ({ ...current, shopId }))} label="Works at" />}
          <StaffProfileFields values={profile} onChange={(patch) => setProfile((current) => ({ ...current, ...patch }))} />
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" pending={saving}>
              <FloppyDiskIcon />
              Save profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
