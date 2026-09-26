"use client"

import { useState } from "react"
import { toast } from "sonner"
import { TrashIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { Segmented } from "@/shared/components/ui/segmented"
import { Textarea } from "@/shared/components/ui/textarea"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { SettingToggle } from "@/features/settings/components/setting-toggle"

const EditorDialog = ({ title, description, onClose, onSubmit, submitLabel, children }) => (
  <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-lg">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
        className="space-y-5"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{submitLabel}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
)

const TextField = ({ id, label, value, onChange, placeholder, hint, ...props }) => (
  <Field>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete="off" {...props} />
    {hint && <FieldDescription>{hint}</FieldDescription>}
  </Field>
)

export const ShopDialog = ({ shop = null, onClose }) => {
  const saveShop = useLedgerStore(({ saveShop }) => saveShop)
  const deleteShop = useLedgerStore(({ deleteShop }) => deleteShop)
  const [confirming, setConfirming] = useState(false)

  const handleDelete = async () => {
    if (!confirming) return setConfirming(true)
    try {
      await deleteShop({ shopId: shop.id })
      toast.success("Shop deleted", { description: shop.name })
      onClose()
    } catch (error) {
      toast.error(error.message)
      setConfirming(false)
    }
  }
  const [draft, setDraft] = useState({
    name: shop?.name ?? "",
    address: shop?.address ?? "",
    city: shop?.city ?? "",
    phone: shop?.phone ?? "",
    ntn: shop?.ntn ?? "",
    strn: shop?.strn ?? "",
    active: shop?.active !== false,
  })
  const change = (patch) => setDraft((current) => ({ ...current, ...patch }))

  const handleSubmit = async () => {
    try {
      const saved = await saveShop({ shopId: shop?.id ?? null, ...draft })
      toast.success(shop ? "Shop updated" : "Shop added", { description: shop ? saved.name : `${saved.name} is ready with counter ${saved.code}-R1.` })
      onClose()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <EditorDialog
      title={shop ? `Edit ${shop.name}` : "New shop"}
      description="Its name, address and tax numbers print on every receipt from this shop."
      submitLabel={shop ? "Save shop" : "Add shop"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <TextField id="shop-name" label="Name" value={draft.name} onChange={(name) => change({ name })} placeholder="e.g. Emporium branch" maxLength={40} autoFocus />
      <Field>
        <FieldLabel htmlFor="shop-address">Address</FieldLabel>
        <Textarea id="shop-address" rows={2} value={draft.address} onChange={(event) => change({ address: event.target.value })} placeholder="Shop 12, Emporium Mall" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="shop-city" label="City" value={draft.city} onChange={(city) => change({ city })} placeholder="Lahore" />
        <TextField id="shop-phone" label="Phone" value={draft.phone} onChange={(phone) => change({ phone })} placeholder="042 3571 0000" inputMode="tel" />
        <TextField id="shop-ntn" label="NTN" value={draft.ntn} onChange={(ntn) => change({ ntn: ntn.replace(/[^\d-]/g, "").slice(0, 9) })} placeholder="1234567-8" inputMode="numeric" className="font-mono" />
        <TextField id="shop-strn" label="STRN" value={draft.strn} onChange={(strn) => change({ strn: strn.replace(/\D/g, "").slice(0, 13) })} placeholder="13 digits" inputMode="numeric" className="font-mono" />
      </div>
      {shop && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">{confirming ? "Delete this shop and its counters for good?" : "Only a shop with no products, sales or staff can be deleted."}</p>
          <Button type="button" size="sm" variant="destructive" onClick={handleDelete}>
            <TrashIcon />
            {confirming ? "Yes, delete" : "Delete shop"}
          </Button>
        </div>
      )}
      {shop && (
        <SettingToggle
          on={draft.active}
          onChange={(active) => change({ active })}
          label="Shop is open"
          description="A closed shop keeps its history, leaves the shop switcher, and its staff can’t sign in until it reopens."
        />
      )}
    </EditorDialog>
  )
}

const copyOptions = [
  { key: "1", label: "1 copy" },
  { key: "2", label: "2 copies" },
]

export const CounterDialog = ({ shop, register = null, onClose }) => {
  const saveRegister = useLedgerStore(({ saveRegister }) => saveRegister)
  const [draft, setDraft] = useState({
    name: register?.name ?? "",
    fbrPosId: register?.fbrPosId ?? "",
    autoPrint: register?.autoPrint ?? false,
    copies: register?.copies ?? 1,
    drawerOnCash: register?.drawerOnCash ?? true,
    manualDrawer: register?.manualDrawer ?? true,
  })
  const change = (patch) => setDraft((current) => ({ ...current, ...patch }))

  const handleSubmit = async () => {
    try {
      const saved = await saveRegister({ registerId: register?.id ?? null, shopId: shop.id, ...draft })
      toast.success(register ? "Counter updated" : "Counter added", { description: `${saved.code} · ${saved.name}` })
      onClose()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <EditorDialog
      title={register ? `Counter ${register.code}` : `New counter at ${shop.name}`}
      description="Each counter has its own cash drawer, shifts, receipt numbers and FBR POSID."
      submitLabel={register ? "Save counter" : "Add counter"}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="counter-name" label="Name" value={draft.name} onChange={(name) => change({ name })} placeholder="Counter 2" maxLength={30} autoFocus />
        <TextField
          id="counter-posid"
          label="FBR POSID"
          value={draft.fbrPosId}
          onChange={(fbrPosId) => change({ fbrPosId: fbrPosId.replace(/\D/g, "").slice(0, 6) })}
          placeholder="6 digits"
          inputMode="numeric"
          className="font-mono"
          hint="Issued by FBR when this counter is registered."
        />
      </div>

      <div className="space-y-4 border-t pt-4">
        <p className="text-sm font-semibold">Receipt printer</p>
        <SettingToggle on={draft.autoPrint} onChange={(autoPrint) => change({ autoPrint })} label="Print automatically after each sale" description="Opens the print dialog as soon as the sale is complete." />
        <Field>
          <FieldLabel>Copies</FieldLabel>
          <Segmented label="Copies" options={copyOptions} value={String(draft.copies)} onChange={(copies) => change({ copies: Number(copies) })} />
          <FieldDescription>Two copies gives the shop a signed slip for card or wallet payments.</FieldDescription>
        </Field>
      </div>

      <div className="space-y-4 border-t pt-4">
        <p className="text-sm font-semibold">Cash drawer</p>
        <SettingToggle on={draft.drawerOnCash} onChange={(drawerOnCash) => change({ drawerOnCash })} label="Open on cash sales" description="The drawer opens when a sale takes cash." />
        <SettingToggle on={draft.manualDrawer} onChange={(manualDrawer) => change({ manualDrawer })} label="Allow opening without a sale" description="Cashiers must give a reason. Every opening shows on the Z-report." />
      </div>
    </EditorDialog>
  )
}
