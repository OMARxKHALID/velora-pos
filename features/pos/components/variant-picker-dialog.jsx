"use client"

import { useState } from "react"
import { cn } from "cn"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { colorSwatches } from "@/features/catalog/lib/catalog"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { formatMoney } from "@/lib/money"

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
            <button
              key={variant.id}
              type="button"
              disabled={left < 1}
              onClick={() => onChoose(variant)}
              className="flex h-16 flex-col items-center justify-center gap-0.5 border transition-colors hover:border-primary disabled:pointer-events-none disabled:opacity-35"
            >
              <span className="text-lg font-semibold tabular-nums">
                {variant.attributes.size}
              </span>
              <span
                className={cn(
                  "text-[0.6rem] tracking-widest uppercase",
                  left <= 2 ? "text-warning" : "text-muted-foreground"
                )}
              >
                {left < 1 ? "None" : `${left} left`}
              </span>
            </button>
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
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Colour
            </p>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setColor(name)}
                  className={cn(
                    "flex h-9 items-center gap-2 border px-3 text-xs transition-colors",
                    color === name
                      ? "border-primary bg-accent/60"
                      : "hover:border-primary/60"
                  )}
                >
                  <span
                    className="size-3.5 rounded-full border border-foreground/20"
                    style={{ backgroundColor: colorSwatches[name] }}
                  />
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Size (EU)
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
