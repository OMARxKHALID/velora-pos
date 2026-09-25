"use client"

import { useState } from "react"
import { BarcodeIcon, MinusIcon, PauseIcon, PlusIcon, ShoppingBagIcon, TrashIcon, XIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { MAX_CASHIER_DISCOUNT } from "@/features/demo/lib/ledger"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { cartTotals } from "@/features/pricing/lib/pricing"
import { formatMoney } from "@/lib/money"
import { useCartStore } from "../store/cart-store-provider"
import { HeldCartsButton } from "./held-carts-button"
import { heldAt } from "../lib/held-carts"
import { ManagerApprovalDialog } from "./manager-approval-dialog"

const discountSteps = [0, 5, 10, 15, 20]
const cashierLimitPct = MAX_CASHIER_DISCOUNT * 100

const ScanField = ({ onScan, availableFor }) => {
  const [code, setCode] = useState("")
  const { variants } = useCatalog()

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || !code.trim()) return
    onScan(code.trim())
    setCode("")
  }

  const handleTestScan = () => {
    const inStock = variants.filter(({ id, active }) => active && availableFor(id) > 0)
    if (!inStock.length) return
    onScan(inStock[Math.floor(Math.random() * inStock.length)].barcode)
  }

  return (
    <InputGroup className="h-11">
      <InputGroupAddon>
        <BarcodeIcon className="text-gold" />
      </InputGroupAddon>
      <InputGroupInput
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        onKeyDown={handleKeyDown}
        inputMode="numeric"
        placeholder="Scan or type barcode, then Enter"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="xs" variant="ghost" onClick={handleTestScan}>
          Test scan
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

const CartLine = ({ row, highlight, canAdd, onQuantity }) => (
  <li className={cn("flex gap-3 border-b px-4 py-3 transition-colors", highlight && "bg-accent/50")}>
    <div className="min-w-0 flex-1 space-y-1">
      <p className="truncate text-sm font-medium">{row.product.name}</p>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ColorDot color={row.variant.attributes.color} className="size-3.5" />
        {row.variant.attributes.color} · EU {row.variant.attributes.size}
        {row.entry === "manual" && <span className="text-2xs tracking-widest uppercase">· manual</span>}
      </p>
      <div className="flex items-center gap-1.5 pt-1">
        <Button size="icon-sm" variant="outline" aria-label="Remove one" onClick={() => onQuantity(row.variantId, row.quantity - 1)}>
          {row.quantity === 1 ? <TrashIcon /> : <MinusIcon />}
        </Button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums select-none">{row.quantity}</span>
        <Button size="icon-sm" variant="outline" aria-label="Add one" disabled={!canAdd} onClick={() => onQuantity(row.variantId, row.quantity + 1)}>
          <PlusIcon />
        </Button>
      </div>
    </div>
    <div className="text-right text-sm tabular-nums">
      <p className="font-semibold">{formatMoney(row.total)}</p>
      {(row.discount > 0 || row.productDiscount > 0) && <p className="text-xs text-muted-foreground line-through">{formatMoney(row.gross)}</p>}
      {row.productDiscount > 0 && <p className="text-2xs font-semibold tracking-widest text-gold uppercase">on offer</p>}
    </div>
  </li>
)

export const CartPanel = ({ user, lastAdded, availableFor, onScan, onCharge, onHold, onOpenHeld, onClose, className }) => {
  const lines = useCartStore(({ lines }) => lines)
  const discountPct = useCartStore(({ discountPct }) => discountPct)
  const approvedBy = useCartStore(({ approvedBy }) => approvedBy)
  const setQuantity = useCartStore(({ setQuantity }) => setQuantity)
  const setDiscount = useCartStore(({ setDiscount }) => setDiscount)
  const clear = useCartStore(({ clear }) => clear)
  const heldCount = useDemoStore(({ heldCarts }) => heldAt(heldCarts).length)
  const settings = useDemoStore(({ settings }) => settings)
  const [pendingDiscount, setPendingDiscount] = useState(null)
  const catalog = useCatalog()
  const { rows, count, subtotal, discountTotal, taxRate, taxLabel, taxTotal, total } = cartTotals(lines, discountPct, catalog, settings)

  const handleDiscount = (pct) => (pct <= cashierLimitPct ? setDiscount(pct) : setPendingDiscount(pct))

  return (
    <aside className={cn("flex min-h-0 flex-col bg-card", className)}>
      <div className="space-y-2.5 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-base font-semibold tracking-wider uppercase">Current sale</h2>
            {count > 0 && (
              <span className="flex size-5 items-center justify-center bg-primary text-2xs font-bold text-primary-foreground tabular-nums">{count}</span>
            )}
          </div>
          {onClose && (
            <Button size="icon-sm" variant="ghost" aria-label="Close cart" onClick={onClose}>
              <XIcon />
            </Button>
          )}
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

        <ScanField onScan={onScan} availableFor={availableFor} />
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
          <p className="text-sm text-muted-foreground">Scan a barcode or tap a shoe to start a sale.</p>
        </div>
      )}

      <div className="space-y-4 border-t p-4">
        {settings.cartDiscountEnabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-label text-muted-foreground uppercase">Discount</span>
              {approvedBy && discountPct > cashierLimitPct && <span className="text-gold">Approved by supervisor</span>}
            </div>
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
          <div className="flex justify-between text-muted-foreground">
            <dt>Discount</dt>
            <dd>{discountTotal ? `− ${formatMoney(discountTotal)}` : "—"}</dd>
          </div>
          {taxTotal > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>
                {taxLabel || "Tax"} {taxRate ? `(${taxRate}%)` : ""}
              </dt>
              <dd>{formatMoney(taxTotal)}</dd>
            </div>
          )}
          <div className="flex items-end justify-between border-t pt-2">
            <dt className="text-xs font-semibold tracking-label uppercase">Total</dt>
            <dd className="font-sans text-2xl font-bold text-gold">{formatMoney(total)}</dd>
          </div>
        </dl>

        <Button size="lg" className="h-14 w-full text-sm" disabled={!rows.length} onClick={onCharge}>
          Charge {formatMoney(total)}
          <Kbd className="ml-2 bg-primary-foreground/15 text-primary-foreground">F2</Kbd>
        </Button>
      </div>

      {pendingDiscount && (
        <ManagerApprovalDialog
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
