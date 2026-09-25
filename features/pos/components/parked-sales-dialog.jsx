"use client"

import { ClockIcon, PauseCircleIcon, PlayIcon, TrashIcon, UserIcon, WarningIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { useSettingsFor } from "@/features/shops/hooks/use-shop-scope"
import { timeAgo } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { fitToStock } from "../lib/cart-fit"
import { cartTotals } from "@/features/pricing/lib/pricing"

const ParkedCard = ({ parked, catalog, settings, stock, onResume, onDiscard }) => {
  const { count, total } = cartTotals(parked.lines, parked.discountPct, catalog, settings)
  const short = fitToStock(parked.lines, stock).adjusted.length
  const preview = parked.lines
    .slice(0, 3)
    .map(({ variantId, quantity }) => {
      const variant = catalog.variantById[variantId]
      const product = variant ? catalog.productById[variant.productId] : null
      return `${product?.name ?? "Item"} (×${quantity})`
    })
    .join(", ")

  return (
    <div className="flex flex-col gap-3 border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2">
          <span className="text-sm font-semibold">{parked.label}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ClockIcon className="size-3 text-gold" />
            {timeAgo(parked.parkedAt)}
          </span>
        </div>
        {(parked.customerName || parked.customerPhone) && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserIcon className="size-3 text-gold" />
            {parked.customerName || "Customer"}
            {parked.customerPhone && <span className="font-mono">· {parked.customerPhone}</span>}
          </p>
        )}
        <p className="truncate text-xs text-muted-foreground">
          {count} {count === 1 ? "item" : "items"}: {preview}
          {parked.lines.length > 3 && ` +${parked.lines.length - 3} more`}
        </p>
        {short > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-warning">
            <WarningIcon className="size-3.5 shrink-0" />
            Stock has changed. Some items will be trimmed when you resume.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
        <span className="font-sans text-lg font-bold text-gold tabular-nums">{formatMoney(total)}</span>
        <div className="flex items-center gap-1.5">
          <Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => onDiscard(parked.id)} aria-label="Discard held sale">
            <TrashIcon />
          </Button>
          <Button size="sm" onClick={() => onResume(parked.id)}>
            <PlayIcon weight="fill" />
            Resume
          </Button>
        </div>
      </div>
    </div>
  )
}

export const ParkedSalesDialog = ({ shopId, heldCarts: parkedSales, onResume, onClose }) => {
  const discardHeldCart = useLedgerStore(({ discardHeldCart }) => discardHeldCart)
  const removeParkedSale = (id) => discardHeldCart(id).catch((error) => toast.error(error.message))
  const stock = useLedgerStore(({ stock }) => stock)
  const settings = useSettingsFor(shopId)
  const catalog = useCatalog()

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PauseCircleIcon className="size-5 text-gold" />
            <DialogTitle>Held sales ({parkedSales.length})</DialogTitle>
          </div>
          <DialogDescription>Held sales are shared by every screen on this counter. Resume one at any time; if the current cart has items, it is held for you first.</DialogDescription>
        </DialogHeader>

        {parkedSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
            <PauseCircleIcon className="size-10 text-muted-foreground/40" />
            <p className="text-sm">No sales on hold.</p>
            <p className="text-xs">Use Hold in the cart to pause a sale and serve another customer.</p>
          </div>
        ) : (
          <div className="max-h-[60dvh] space-y-2 overflow-y-auto pr-1">
            {parkedSales.map((parked) => (
              <ParkedCard key={parked.id} parked={parked} catalog={catalog} settings={settings} stock={stock} onResume={onResume} onDiscard={removeParkedSale} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
