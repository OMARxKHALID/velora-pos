"use client"

import { useState } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { BarcodeIcon, MinusIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { beep } from "@/features/pos/lib/beep"
import { formatMoney, sumBy } from "@/lib/money"
import { purchaseSchema } from "../schemas"

export const ReceiveStockDialog = ({ user, onClose }) => {
  const stock = useDemoStore(({ stock }) => stock)
  const { productById, variantByBarcode, variantById, variants: allVariants } = useCatalog()
  const variants = allVariants.filter(({ active }) => active)
  const receivePurchase = useDemoStore(({ receivePurchase }) => receivePurchase)
  const [code, setCode] = useState("")
  const form = useForm({ resolver: zodResolver(purchaseSchema), defaultValues: { supplier: "Velora Warehouse", lines: [] } })
  const { fields, append, update, remove, replace } = useFieldArray({ control: form.control, name: "lines" })
  const lines = useWatch({ control: form.control, name: "lines" })

  const addVariant = (variantId, quantity = 1) => {
    const index = lines.findIndex((line) => line.variantId === variantId)
    if (index >= 0) update(index, { variantId, quantity: Number(lines[index].quantity) + quantity })
    else append({ variantId, quantity })
    form.clearErrors("lines")
  }

  const handleScan = (value) => {
    const variant = variantByBarcode[value.trim()]
    if (!variant || !variant.active) {
      beep(false)
      toast.error("Barcode not found", { description: value })
      return
    }
    beep(true)
    addVariant(variant.id)
  }

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    if (code.trim()) handleScan(code)
    setCode("")
  }

  const handleAddLowStock = () => {
    const low = variants.filter(({ id, lowStockAt }) => (stock[id] ?? 0) <= lowStockAt)
    replace(low.map(({ id }) => ({ variantId: id, quantity: 6 })))
    form.clearErrors("lines")
  }

  const handleSubmit = form.handleSubmit(({ supplier, lines: received }) => {
    try {
      const purchase = receivePurchase({
        supplier,
        receivedBy: user.id,
        lines: received.map(({ variantId, quantity }) => ({ variantId, quantity, unitCost: variantById[variantId].cost })),
      })
      toast.success("Delivery received", {
        description: `${sumBy(purchase.items, ({ quantity }) => quantity)} pairs from ${supplier} · ${formatMoney(purchase.total)} at cost`,
      })
      onClose()
    } catch (error) {
      toast.error(error.message)
    }
  })

  const pairs = sumBy(lines, ({ quantity }) => Number(quantity) || 0)
  const cost = sumBy(lines, ({ variantId, quantity }) => variantById[variantId].cost * (Number(quantity) || 0))

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92svh] flex-col sm:max-w-xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Receive delivery</DialogTitle>
            <DialogDescription>Scan each box as it comes in. Every pair is recorded as a purchase movement.</DialogDescription>
          </DialogHeader>

          <FieldGroup className="min-h-0">
            <Controller
              name="supplier"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Supplier</FieldLabel>
                  <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Field data-invalid={!!form.formState.errors.lines}>
              <FieldLabel>Items</FieldLabel>
              <InputGroup className="h-10">
                <InputGroupAddon>
                  <BarcodeIcon className="text-gold" />
                </InputGroupAddon>
                <InputGroupInput
                  value={code}
                  autoFocus
                  inputMode="numeric"
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  onKeyDown={handleKeyDown}
                  placeholder="Scan box barcode, then Enter"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton size="xs" variant="ghost" onClick={() => handleScan(variants[Math.floor(Math.random() * variants.length)].barcode)}>
                    Test scan
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <Button type="button" variant="link" size="xs" className="w-fit px-0" onClick={handleAddLowStock}>
                Reorder everything low or out of stock
              </Button>

              {fields.length > 0 && (
                <ul className="max-h-64 divide-y overflow-y-auto border">
                  {fields.map((line, index) => {
                    const variant = variantById[line.variantId]
                    const quantity = Number(lines[index]?.quantity) || 0
                    return (
                      <li key={line.id} className="flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{productById[variant.productId].name}</p>
                          <p className="text-xs text-muted-foreground">
                            {variant.attributes.color} · EU {variant.attributes.size} · {stock[variant.id] ?? 0} on hand
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" size="icon-xs" variant="outline" aria-label="Less" onClick={() => (quantity <= 1 ? remove(index) : update(index, { ...line, quantity: quantity - 1 }))}>
                            {quantity <= 1 ? <TrashIcon /> : <MinusIcon />}
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                          <Button type="button" size="icon-xs" variant="outline" aria-label="More" onClick={() => update(index, { ...line, quantity: quantity + 1 })}>
                            <PlusIcon />
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              {form.formState.errors.lines && <FieldError errors={[form.formState.errors.lines.root ?? form.formState.errors.lines]} />}
            </Field>
          </FieldGroup>

          <div className="flex items-center justify-between border bg-muted/50 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {pairs} pairs · {fields.length} sizes
            </span>
            <span className="font-heading text-lg font-bold text-gold tabular-nums">{formatMoney(cost)} at cost</span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Receive {pairs || ""} pairs</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
