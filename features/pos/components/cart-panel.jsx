"use client"

import { useState } from "react"
import { BarcodeIcon, CaretDownIcon, MinusIcon, PauseIcon, PlusIcon, ShoppingBagIcon, TrashIcon, XIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { MAX_CASHIER_DISCOUNT } from "@/features/ledger/lib/rules"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { cartTotals } from "@/features/pricing/lib/pricing"
import { formatMoney } from "@/lib/money"
import { useCartStore } from "../store/cart-store-provider"
import { HeldCartsButton } from "./held-carts-button"
import { heldAt } from "../lib/held-carts"
import { ManagerApprovalDialog } from "./manager-approval-dialog"
import { sizeLabel } from "@/features/catalog/lib/catalog"
import { useSettingsFor } from "@/features/shops/hooks/use-shop-scope"

const discountSteps = [0, 5, 10, 15, 20]
const cashierLimitPct = MAX_CASHIER_DISCOUNT * 100

const ScanField = ({ onScan, autoFocus }) => {
  const [code, setCode] = useState("")

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || !code.trim()) return
    onScan(code.trim())
    setCode("")
  }

  return (
    <InputGroup className="h-11">
      <InputGroupAddon>
        <BarcodeIcon className="text-gold" />
      </InputGroupAddon>
      <InputGroupInput
        value={code}
        autoFocus={autoFocus}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        onKeyDown={handleKeyDown}
        inputMode="numeric"
        enterKeyHint="done"
        placeholder="Scan or type barcode"
      />
    </InputGroup>
  )
}

const CartLine = ({ row, highlight, canAdd, onQuantity }) => (
  <li className={cn("space-y-1.5 border-b px-4 py-2.5 transition-colors", highlight && "bg-accent/50")}>
    <div className="flex items-baseline justify-between gap-3">
      <p className="min-w-0 truncate text-sm font-medium">{row.product.name}</p>
      <p className="shrink-0 text-sm tabular-nums">
        {(row.discount > 0 || row.productDiscount > 0) && <span className="mr-1.5 text-xs text-muted-foreground line-through">{formatMoney(row.gross)}</span>}
        <span className="font-semibold">{formatMoney(row.total)}</span>
      </p>
    </div>
    <div className="flex items-center justify-between gap-3">
      <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <ColorDot color={row.variant.attributes.color} className="size-3.5 shrink-0" />
        <span className="truncate">
          {row.variant.attributes.color} · {sizeLabel(row.variant.attributes.size)}
          {row.productDiscount > 0 && <span className="text-gold"> · On offer</span>}
          {row.entry === "manual" && " · typed in"}
        </span>
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="icon-sm" variant="outline" aria-label={row.quantity === 1 ? "Remove item" : "Remove one"} onClick={() => onQuantity(row.variantId, row.quantity - 1)}>
          {row.quantity === 1 ? <TrashIcon /> : <MinusIcon />}
        </Button>
        <span className="w-7 text-center text-sm font-semibold tabular-nums select-none">{row.quantity}</span>
        <Button size="icon-sm" variant="outline" aria-label="Add one" disabled={!canAdd} onClick={() => onQuantity(row.variantId, row.quantity + 1)}>
          <PlusIcon />
        </Button>
      </div>
    </div>
  </li>
)

export const CartPanel = ({ shopId, lastAdded, availableFor, onScan, onCharge, onHold, onOpenHeld, onClose, focusScan = false, className }) => {
  const lines = useCartStore(({ lines }) => lines)
  const discountPct = useCartStore(({ discountPct }) => discountPct)
  const approvedBy = useCartStore(({ approvedBy }) => approvedBy)
  const setQuantity = useCartStore(({ setQuantity }) => setQuantity)
  const setDiscount = useCartStore(({ setDiscount }) => setDiscount)
  const clear = useCartStore(({ clear }) => clear)
  const restore = useCartStore(({ restore }) => restore)
  const heldCount = useLedgerStore(({ heldCarts }) => heldAt(heldCarts).length)
  const settings = useSettingsFor(shopId)
  const [pendingDiscount, setPendingDiscount] = useState(null)
  const [discountOpen, setDiscountOpen] = useState(false)
  const catalog = useCatalog()
  const { rows, count, subtotal, discountTotal, taxRate, taxLabel, taxTotal, taxInclusive, serviceFee, total } = cartTotals(lines, discountPct, catalog, settings)

  const handleDiscount = (pct) => {
    setDiscountOpen(false)
    if (pct <= cashierLimitPct) setDiscount(pct)
    else setPendingDiscount(pct)
  }

  const handleClear = () => {
    const removed = clear()
    toast("Sale cleared", {
      description: `${count} ${count === 1 ? "item" : "items"} removed.`,
      action: {
        label: "Undo",
        onClick: () => {
          if (!restore(removed)) toast.error("New items were added, so the cleared sale cannot come back.")
        },
      },
    })
  }

  return (
    <aside className={cn("flex min-h-0 flex-col bg-card", className)}>
      <div className="space-y-2.5 border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold whitespace-nowrap">Current sale</h2>
            {count > 0 && (
              <span className="flex size-5 shrink-0 items-center justify-center bg-primary text-2xs font-bold text-primary-foreground tabular-nums">{count}</span>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <HeldCartsButton count={heldCount} onClick={onOpenHeld} />
            <Button type="button" size="sm" variant="outline" disabled={!rows.length} onClick={onHold} title="Hold this sale to serve another customer" className="px-3">
              <PauseIcon className="text-gold" />
              Hold
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              disabled={!rows.length}
              onClick={handleClear}
              aria-label="Clear sale"
              title="Remove every item from this sale"
              className="text-muted-foreground hover:border-destructive/40 hover:text-destructive"
            >
              <TrashIcon />
            </Button>
            {onClose && (
              <Button size="icon-sm" variant="ghost" aria-label="Close cart" onClick={onClose}>
                <XIcon />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          <HeldCartsButton count={heldCount} onClick={onOpenHeld} />
          <Button type="button" size="sm" variant="outline" disabled={!rows.length} onClick={onHold} title="Hold this sale to serve another customer" className="w-full px-2">
            <PauseIcon className="text-gold" />
            Hold
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!rows.length}
            onClick={clear}
            title="Remove every item from this sale"
            className="w-full px-2 text-muted-foreground hover:border-destructive/40 hover:text-destructive"
          >
            <TrashIcon />
            Clear
          </Button>
        </div>

        <ScanField onScan={onScan} autoFocus={focusScan} />
      </div>

      {rows.length ? (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {rows.map((row) => (
            <CartLine key={row.variantId} row={row} highlight={row.variantId === lastAdded} canAdd={availableFor(row.variantId) > 0} onQuantity={setQuantity} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <ShoppingBagIcon className="size-10 text-gold" weight="thin" />
          <p className="text-sm text-muted-foreground">Scan a barcode or tap a product to start a sale.</p>
        </div>
      )}

      <div className="space-y-3 border-t p-4">
        {settings.cartDiscountEnabled && discountOpen && rows.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-1">
              {discountSteps.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  disabled={!rows.length}
                  aria-pressed={discountPct === pct}
                  onClick={() => handleDiscount(pct)}
                  className={cn(
                    "h-9 border text-xs font-semibold tabular-nums transition-colors disabled:opacity-40 pointer-coarse:h-11",
                    discountPct === pct ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/60"
                  )}
                >
                  {pct ? `${pct}%` : "None"}
                </button>
              ))}
            </div>
          </div>
        )}

        <dl className="space-y-1.5 text-sm tabular-nums">
          <div className="flex justify-between text-muted-foreground">
            <dt>
              Subtotal · {count} {count === 1 ? "item" : "items"}
            </dt>
            <dd>{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <dt>
              Discount
              {discountPct > 0 && ` · ${discountPct}%`}
              {approvedBy && discountPct > cashierLimitPct && <span className="text-gold"> · approved</span>}
            </dt>
            <dd>
              {settings.cartDiscountEnabled ? (
                <button
                  type="button"
                  disabled={!rows.length}
                  aria-expanded={discountOpen}
                  onClick={() => setDiscountOpen((open) => !open)}
                  className="-my-1 flex items-center gap-1 py-1 text-gold underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline pointer-coarse:-my-2 pointer-coarse:py-2"
                >
                  {discountTotal ? `− ${formatMoney(discountTotal)}` : "Add"}
                  <CaretDownIcon className={cn("size-3.5 transition-transform", discountOpen && "rotate-180")} />
                </button>
              ) : discountTotal ? (
                `− ${formatMoney(discountTotal)}`
              ) : (
                "—"
              )}
            </dd>
          </div>
          {taxTotal > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>
                {taxInclusive ? "Incl. " : ""}
                {taxLabel || "Tax"} {taxRate ? `(${taxRate}%)` : ""}
              </dt>
              <dd>{formatMoney(taxTotal)}</dd>
            </div>
          )}
          {serviceFee > 0 && rows.length > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>FBR POS fee</dt>
              <dd>{formatMoney(serviceFee)}</dd>
            </div>
          )}
          <div className="flex items-end justify-between border-t pt-2">
            <dt className="text-xs font-semibold tracking-label uppercase">Total</dt>
            <dd className="font-sans text-2xl font-bold text-gold">{formatMoney(total)}</dd>
          </div>
        </dl>

        <Button size="lg" className="h-12 w-full text-sm pointer-coarse:h-14" disabled={!rows.length} onClick={onCharge}>
          Charge {formatMoney(total)}
          <Kbd className="ml-2 bg-primary-foreground/15 text-primary-foreground pointer-coarse:hidden">F2</Kbd>
        </Button>
      </div>

      {pendingDiscount && (
        <ManagerApprovalDialog
          shopId={shopId}
          reason={`${pendingDiscount}% discount is above the ${cashierLimitPct}% cashier limit.`}
          discountPct={pendingDiscount}
          onClose={() => setPendingDiscount(null)}
          onApprove={(approverId, token) => {
            setDiscount(pendingDiscount, approverId, token)
            setPendingDiscount(null)
          }}
        />
      )}
    </aside>
  )
}
