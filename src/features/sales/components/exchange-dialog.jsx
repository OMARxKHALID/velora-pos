"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArrowsLeftRightIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { refundableQuantity } from "@/features/ledger/lib/rules"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { newId } from "@/shared/lib/id"
import { sizeLabel } from "@/features/catalog/lib/catalog"

const sectionLabel = "text-2xs font-semibold tracking-label text-muted-foreground uppercase"

const describe = ({ attributes }) => `${attributes.color} · ${sizeLabel(attributes.size)}`

export const ExchangeDialog = ({ sale, onClose }) => {
  const refunds = useLedgerStore(({ refunds }) => refunds).filter(({ saleId }) => saleId === sale.id)
  const exchanges = useLedgerStore(({ exchanges }) => exchanges).filter(({ saleId }) => saleId === sale.id)
  const stock = useLedgerStore(({ stock }) => stock)
  const exchangeItem = useLedgerStore(({ exchangeItem }) => exchangeItem)
  const { productById, variantById, variantsByProduct } = useCatalog()
  const [clientId] = useState(newId)

  const swappable = sale.items
    .map((item) => ({ item, left: refundableQuantity({ sales: [sale], refunds, exchanges }, sale.id, item.variantId) }))
    .filter(({ left }) => left > 0)
  const [fromId, setFromId] = useState(swappable[0]?.item.variantId ?? null)
  const [quantity, setQuantity] = useState(1)
  const from = variantById[fromId]
  const product = from ? productById[from.productId] : null
  const [color, setColor] = useState(from?.attributes.color ?? null)
  const [toId, setToId] = useState(null)
  const max = swappable.find(({ item }) => item.variantId === fromId)?.left ?? 0

  const handlePickItem = (variantId) => {
    setFromId(variantId)
    setColor(variantById[variantId]?.attributes.color ?? null)
    setToId(null)
    setQuantity(1)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await exchangeItem({ saleId: sale.id, fromVariantId: fromId, toVariantId: toId, quantity, clientId })
      toast.success("Swapped", { description: `${product.name}: ${describe(from)} → ${describe(variantById[toId])}` })
      onClose()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const sizes = product ? (variantsByProduct[product.id] ?? []).filter(({ active, attributes, id }) => active && attributes.color === color && id !== fromId) : []

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Exchange size</DialogTitle>
            <DialogDescription>
              {sale.number}. Swap for another size or colour of the same product at no charge. Swapped items cannot be refunded later.
            </DialogDescription>
          </DialogHeader>

          {!swappable.length ? (
            <p className="text-sm text-muted-foreground">Everything on this sale has already been returned or swapped.</p>
          ) : (
            <>
              <div className="space-y-2">
                <p className={sectionLabel}>Customer returns</p>
                <ul className="divide-y border">
                  {swappable.map(({ item, left }) => (
                    <li key={item.variantId}>
                      <button
                        type="button"
                        aria-pressed={fromId === item.variantId}
                        onClick={() => handlePickItem(item.variantId)}
                        className={cn("flex w-full items-center justify-between gap-3 p-3 text-left transition-colors", fromId === item.variantId ? "bg-accent/60" : "hover:bg-muted/50")}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{item.productName}</span>
                          <span className="block text-xs text-muted-foreground">
                            {item.attributes.color} · {sizeLabel(item.attributes.size)} · {left} can be swapped
                          </span>
                        </span>
                        <ColorDot color={item.attributes.color} />
                      </button>
                    </li>
                  ))}
                </ul>
                {max > 1 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">How many</span>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon-sm" variant="outline" aria-label="Fewer" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}>
                        <MinusIcon />
                      </Button>
                      <span className="w-8 text-center font-semibold tabular-nums">{quantity}</span>
                      <Button type="button" size="icon-sm" variant="outline" aria-label="More" disabled={quantity >= max} onClick={() => setQuantity(quantity + 1)}>
                        <PlusIcon />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {product && (
                <div className="space-y-2">
                  <p className={sectionLabel}>New size or colour</p>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((name) => (
                      <button
                        key={name}
                        type="button"
                        aria-pressed={color === name}
                        onClick={() => {
                          setColor(name)
                          setToId(null)
                        }}
                        className={cn("flex h-9 items-center gap-2 border px-3 text-xs transition-colors pointer-coarse:h-11", color === name ? "border-primary bg-accent/60" : "hover:border-primary/60")}
                      >
                        <ColorDot color={name} className="size-3.5" />
                        {name}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {sizes.map((variant) => {
                      const left = stock[variant.id] ?? 0
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          aria-pressed={toId === variant.id}
                          disabled={left < quantity}
                          onClick={() => setToId(variant.id)}
                          className={cn(
                            "flex h-16 flex-col items-center justify-center gap-0.5 border transition-colors disabled:pointer-events-none disabled:opacity-35",
                            toId === variant.id ? "border-primary bg-accent/60" : "hover:border-primary"
                          )}
                        >
                          <span className={cn("font-semibold tabular-nums", /^\d+$/.test(variant.attributes.size) ? "text-lg" : "text-sm")}>{variant.attributes.size}</span>
                          <span className={cn("text-2xs", left <= 2 ? "text-warning" : "text-muted-foreground")}>{left < 1 ? "None" : `${left} left`}</span>
                        </button>
                      )
                    })}
                  </div>
                  {!sizes.length && <p className="text-sm text-muted-foreground">No other sizes in this colour.</p>}
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!fromId || !toId || (stock[toId] ?? 0) < quantity}>
              <ArrowsLeftRightIcon />
              Swap {quantity > 1 ? `${quantity} items` : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
