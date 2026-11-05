"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { SIZE_TYPES } from "../lib/catalog"
import { CategoryEditorDialog } from "./category-editor-dialog"
import { IconForKey } from "./category-icon"

export const CategoriesDialog = ({ onClose }) => {
  const categories = useLedgerStore(({ categories }) => categories)
  const products = useLedgerStore(({ products }) => products)
  const deleteCategory = useLedgerStore(({ deleteCategory }) => deleteCategory)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [removingBusy, setRemovingBusy] = useState(false)

  const countOf = (category) => products.filter((product) => product.category.toLowerCase() === category.name.toLowerCase()).length

  const handleDelete = async () => {
    if (removingBusy) return
    setRemovingBusy(true)
    try {
      await deleteCategory(removing.id)
      toast.success("Category removed", { description: removing.name })
    } catch (error) {
      toast.error(error.message)
    }
    setRemovingBusy(false)
    setRemoving(null)
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !editing && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Categories</DialogTitle>
            <DialogDescription>Add anything the shop sells, like socks, polish or brushes. Each category sets which sizes its products use.</DialogDescription>
          </DialogHeader>

          <ul className="divide-y border">
            {categories.map((category) => {
              const count = countOf(category)
              return (
                <li key={category.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center bg-muted text-gold">
                    <IconForKey icon={category.icon} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{category.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {SIZE_TYPES[category.sizeType]?.label} · {count} {count === 1 ? "product" : "products"}
                    </span>
                  </span>
                  <Button size="icon-sm" variant="ghost" aria-label={`Edit ${category.name}`} onClick={() => setEditing({ category, inUse: count > 0 })}>
                    <PencilSimpleIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Delete ${category.name}`}
                    aria-disabled={count > 0}
                    className="aria-disabled:opacity-50"
                    onClick={() => (count ? toast.info(`${category.name} is in use`, { description: "Move its products to another category first." }) : setRemoving(category))}
                  >
                    <TrashIcon />
                  </Button>
                </li>
              )
            })}
          </ul>

          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setEditing({ category: null, inUse: false })}>
              <PlusIcon />
              New category
            </Button>
            <Button onClick={onClose}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    {removing && (
      <AlertDialog open onOpenChange={(open) => !open && !removingBusy && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing.name}?</AlertDialogTitle>
            <AlertDialogDescription>No products use it. You can add it again later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingBusy}>Keep it</AlertDialogCancel>
            <Button variant="destructive" pending={removingBusy} onClick={handleDelete}>
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
      {editing && <CategoryEditorDialog category={editing.category} inUse={editing.inUse} onClose={() => setEditing(null)} />}
    </>
  )
}
