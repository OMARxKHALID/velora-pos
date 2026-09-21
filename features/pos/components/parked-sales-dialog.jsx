"use client"

import { ClockIcon, PauseCircleIcon, PlayIcon, TrashIcon, UserIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { formatMoney } from "@/lib/money"
import { cartTotals } from "../lib/cart-totals"
import { useCartStore } from "../store/cart-store-provider"

const timeAgo = (timestamp) => {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (diffSec < 60) return "Just now"
  const mins = Math.floor(diffSec / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return `${hours}h ago`
}

const ParkedCard = ({ parked, catalog, settings, onResume, onDiscard }) => {
  const { count, total } = cartTotals(parked.lines, parked.discountPct, catalog, settings)
  const preview = parked.lines
    .slice(0, 3)
    .map((line) => {
      const v = catalog.variantById[line.variantId]
      const p = v ? catalog.productById[v.productId] : null
      return p ? `${p.name} (x${line.quantity})` : `Item (x${line.quantity})`
    })
    .join(", ")

  return (
    <div className="flex flex-col gap-2.5 border bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-heading text-sm font-bold uppercase tracking-wider">{parked.label}</span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <ClockIcon className="size-3 text-gold" />
            {timeAgo(parked.parkedAt)}
          </span>
        </div>
        {(parked.customerName || parked.customerPhone) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserIcon className="size-3 text-gold" />
            <span>{parked.customerName || "Customer"}</span>
            {parked.customerPhone && <span className="font-mono">· {parked.customerPhone}</span>}
          </div>
        )}
        <p className="truncate text-xs text-muted-foreground">
          {count} {count === 1 ? "item" : "items"}: {preview}
          {parked.lines.length > 3 && ` +${parked.lines.length - 3} more`}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
        <span className="font-heading text-base font-bold text-gold tabular-nums">{formatMoney(total)}</span>
        <div className="flex items-center gap-1.5">
          <Button
            size="icon-sm"
            variant="ghost"
            className="size-9 pointer-coarse:size-11 text-muted-foreground hover:text-destructive touch-manipulation active:scale-95"
            onClick={() => onDiscard(parked.id)}
            title="Discard held sale"
          >
            <TrashIcon className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="default"
            className="h-9 px-3.5 gap-1.5 text-xs font-semibold touch-manipulation active:scale-95 pointer-coarse:h-11 pointer-coarse:px-5"
            onClick={() => onResume(parked.id)}
          >
            <PlayIcon className="size-3.5" weight="fill" />
            Resume
          </Button>
        </div>
      </div>
    </div>
  )
}

export const ParkedSalesDialog = ({ onClose }) => {
  const parkedSales = useCartStore(({ parkedSales }) => parkedSales)
  const resumeSale = useCartStore(({ resumeSale }) => resumeSale)
  const removeParkedSale = useCartStore(({ removeParkedSale }) => removeParkedSale)
  const catalog = useCatalog()
  const settings = useDemoStore(({ settings }) => settings)

  const handleResume = (id) => {
    resumeSale(id)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PauseCircleIcon className="size-5 text-gold" />
            <DialogTitle>Held sales ({parkedSales.length})</DialogTitle>
          </div>
          <DialogDescription>
            Parked sales can be resumed at any time. Resuming will swap your current cart if not empty.
          </DialogDescription>
        </DialogHeader>

        {parkedSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
            <PauseCircleIcon className="size-10 text-muted-foreground/40" />
            <p className="text-sm">No sales currently on hold.</p>
            <p className="text-xs">Use the “Hold” button in the cart to pause a transaction and serve another customer.</p>
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {parkedSales.map((parked) => (
              <ParkedCard
                key={parked.id}
                parked={parked}
                catalog={catalog}
                settings={settings}
                onResume={handleResume}
                onDiscard={removeParkedSale}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
