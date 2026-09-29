"use client"

import { useState } from "react"
import { cn } from "cn"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { ColorChoice } from "@/features/catalog/components/color-choice"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { formatMoney } from "@/shared/lib/money"

const SizeGrid = ({ product, color, availableFor, onChoose }) => {
  const { variantsByProduct } = useCatalog()
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {variantsByProduct[product.id]
        .filter(
          ({ attributes, active }) => active && attributes.color === color
        )
        .map((variant) => {
          const left = availableFor(variant.id)
          return (
            <Button
              key={variant.id}
              variant="outline"
              disabled={left < 1}
              onClick={() => onChoose(variant)}
              className="h-16 flex-col gap-0.5 px-0 hover:border-primary hover:bg-transparent disabled:opacity-35"
            >
              <span className={cn("font-semibold tabular-nums", /^\d+$/.test(variant.attributes.size) ? "text-lg" : "text-sm")}>{variant.attributes.size}</span>
              <span className={cn("text-2xs tracking-label uppercase", left <= 2 ? "text-warning" : "text-muted-foreground")}>{left < 1 ? "None" : `${left} left`}</span>
            </Button>
          )
        })}
    </div>
  )
}

export const VariantPickerDialog = ({
  product,
  availableFor,
  onChoose,
  onClose,
}) => {
  const [color, setColor] = useState(product.colors[0])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            {product.brand} · {product.category} ·{" "}
            <span className="font-semibold text-gold">
              {formatMoney(product.price)}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">
              Colour
            </p>
            <ColorChoice colors={product.colors} value={color} onChange={setColor} />
          </div>
          <div className="space-y-2">
            <p className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">
              Size
            </p>
            <SizeGrid
              product={product}
              color={color}
              availableFor={availableFor}
              onChoose={onChoose}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
