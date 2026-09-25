"use client"

import { useState } from "react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Segmented } from "@/components/ui/segmented"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { CATEGORY_ICONS, SIZE_TYPES } from "../lib/catalog"
import { IconForKey } from "./category-icon"

const sizeOptions = Object.entries(SIZE_TYPES).map(([key, { label }]) => ({ key, label }))

const sizeHints = {
  shoe: "EU sizes 28 to 47, picked per product. For shoes and sandals.",
  clothing: "XS, S, M, L, XL, XXL. For socks and similar items.",
  one: "A single size. For polish, brushes, laces and similar items.",
}

export const CategoryEditorDialog = ({ category = null, inUse = false, onClose, onSaved }) => {
  const saveCategory = useDemoStore(({ saveCategory }) => saveCategory)
  const [draft, setDraft] = useState({ name: category?.name ?? "", sizeType: category?.sizeType ?? "one", icon: category?.icon ?? "tag", pctCode: category?.pctCode ?? "", lowStockAt: category?.lowStockAt ?? "" })
  const change = (patch) => setDraft((current) => ({ ...current, ...patch }))

  const handleSubmit = (event) => {
    event.preventDefault()
    try {
      const saved = saveCategory({ categoryId: category?.id ?? null, ...draft })
      toast.success(category ? "Category updated" : "Category added", { description: saved.name })
      onSaved?.(saved)
      onClose()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>Categories group products at the counter and decide which sizes a product can have.</DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="category-name">Name</FieldLabel>
            <Input id="category-name" value={draft.name} onChange={(event) => change({ name: event.target.value })} placeholder="e.g. Socks, Shoe care" maxLength={30} autoFocus autoComplete="off" />
            {category && inUse && <FieldDescription>Renaming moves every product in this category along with it.</FieldDescription>}
          </Field>

          <Field>
            <FieldLabel>Sizes</FieldLabel>
            <Segmented label="Sizes" options={sizeOptions} value={draft.sizeType} onChange={(sizeType) => change({ sizeType })} className={cn(inUse && "pointer-events-none opacity-50")} />
            <FieldDescription>{inUse ? "Locked because products already use these sizes." : sizeHints[draft.sizeType]}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Icon</FieldLabel>
            <div role="radiogroup" aria-label="Icon" className="grid grid-cols-5 gap-1.5">
              {CATEGORY_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  role="radio"
                  aria-checked={draft.icon === icon}
                  aria-label={icon}
                  onClick={() => change({ icon })}
                  className={cn(
                    "flex h-11 items-center justify-center border transition-colors pointer-coarse:h-12",
                    draft.icon === icon ? "border-primary bg-accent/60 text-gold" : "text-muted-foreground hover:border-primary/60 hover:text-foreground"
                  )}
                >
                  <IconForKey icon={icon} className="size-6" weight={draft.icon === icon ? "regular" : "thin"} />
                </button>
              ))}
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="category-pct">PCT code (optional)</FieldLabel>
            <Input id="category-pct" value={draft.pctCode} onChange={(event) => change({ pctCode: event.target.value.replace(/[^\d.]/g, "").slice(0, 9) })} placeholder="6115.9500" inputMode="decimal" className="max-w-48 font-mono" />
            <FieldDescription>Default tariff heading reported to FBR for products in this category.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="category-low">Low-stock warning (optional)</FieldLabel>
            <Input id="category-low" value={draft.lowStockAt} onChange={(event) => change({ lowStockAt: event.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="Shop setting" inputMode="numeric" className="max-w-32 tabular-nums" />
            <FieldDescription>Warn when a size has this many or fewer. Empty uses the shop-wide setting.</FieldDescription>
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{category ? "Save category" : "Add category"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
