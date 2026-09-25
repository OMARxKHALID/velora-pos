"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { SIZE_TYPES } from "../lib/catalog"
import { CategoryEditorDialog } from "./category-editor-dialog"
import { IconForKey } from "./category-icon"

export const CategoriesDialog = ({ onClose }) => {
  const categories = useLedgerStore(({ categories }) => categories)
  const products = useLedgerStore(({ products }) => products)
  const deleteCategory = useLedgerStore(({ deleteCategory }) => deleteCategory)
  const [editing, setEditing] = useState(null)

  const countOf = (category) => products.filter((product) => product.category.toLowerCase() === category.name.toLowerCase()).length

  const handleDelete = (category) => {
    try {
      deleteCategory({ categoryId: category.id })
      toast.success("Category removed", { description: category.name })
    } catch (error) {
      toast.error(error.message)
    }
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
                  <Button size="icon-sm" variant="ghost" aria-label={`Delete ${category.name}`} disabled={count > 0} title={count ? "Move its products first" : undefined} onClick={() => handleDelete(category)}>
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
      {editing && <CategoryEditorDialog category={editing.category} inUse={editing.inUse} onClose={() => setEditing(null)} />}
    </>
  )
}
