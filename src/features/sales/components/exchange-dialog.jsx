"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ArrowsLeftRightIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/shared/components/ui/button"
import { QuantityStepper } from "@/shared/components/ui/quantity-stepper"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { ColorChoice } from "@/features/catalog/components/color-choice"
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"
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
  const [saving, setSaving] = useState(false)
  const max = swappable.find(({ item }) => item.variantId === fromId)?.left ?? 0

  const handlePickItem = (variantId) => {
    setFromId(variantId)
    setColor(variantById[variantId]?.attributes.color ?? null)
    setToId(null)
    setQuantity(1)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await exchangeItem({ saleId: sale.id, fromVariantId: fromId, toVariantId: toId, quantity, clientId })
      toast.success("Swapped", { description: `${product.name}: ${describe(from)} → ${describe(variantById[toId])}` })
      onClose()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const sizes = product ? (variantsByProduct[product.id] ?? []).filter(({ active, attributes, id }) => active && attributes.color === color && id !== fromId) : []

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
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
                <ToggleGroup aria-label="Customer returns" orientation="vertical" spacing={0} value={fromId ? [fromId] : []} onValueChange={([next]) => next && handlePickItem(next)} className="w-full divide-y border">
                  {swappable.map(({ item, left }) => (
                    <ToggleGroupItem
                      key={item.variantId}
                      value={item.variantId}
                      className="h-auto w-full justify-between gap-3 p-3 text-left font-normal tracking-normal whitespace-normal normal-case hover:bg-muted/50 aria-pressed:bg-accent/60 aria-pressed:hover:bg-accent/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{item.productName}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.attributes.color} · {sizeLabel(item.attributes.size)} · {left} can be swapped
                        </span>
                      </span>
                      <ColorDot color={item.attributes.color} />
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                {max > 1 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">How many</span>
                    <QuantityStepper value={quantity} min={1} max={max} onChange={setQuantity} />
                  </div>
                )}
              </div>

              {product && (
                <div className="space-y-2">
                  <p className={sectionLabel}>New size or colour</p>
                  <ColorChoice
                    colors={product.colors}
                    value={color}
                    onChange={(name) => {
                      setColor(name)
                      setToId(null)
                    }}
                  />
                  <ToggleGroup aria-label="New size" variant="chip" size="tile" value={toId ? [toId] : []} onValueChange={([next]) => next && setToId(next)} className="grid w-full grid-cols-4 sm:grid-cols-5">
                    {sizes.map((variant) => {
                      const left = stock[variant.id] ?? 0
                      return (
                        <ToggleGroupItem key={variant.id} value={variant.id} disabled={left < quantity} className="h-16 px-0 hover:border-primary disabled:opacity-35">
                          <span className={cn("font-semibold tabular-nums", /^\d+$/.test(variant.attributes.size) ? "text-lg" : "text-sm")}>{variant.attributes.size}</span>
                          <span className={cn("text-2xs", left <= 2 ? "text-warning" : "text-muted-foreground")}>{left < 1 ? "None" : `${left} left`}</span>
                        </ToggleGroupItem>
                      )
                    })}
                  </ToggleGroup>
                  {!sizes.length && <p className="text-sm text-muted-foreground">No other sizes in this colour.</p>}
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!fromId || !toId || (stock[toId] ?? 0) < quantity} pending={saving}>
              <ArrowsLeftRightIcon />
              Swap {quantity > 1 ? `${quantity} items` : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
