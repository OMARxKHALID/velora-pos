"use client"

import { useState } from "react"
import { BarcodeIcon, MinusIcon, PauseCircleIcon, PauseIcon, PlusIcon, ShoppingBagIcon, TrashIcon, XIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { MAX_CASHIER_DISCOUNT } from "@/features/demo/lib/ledger"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { formatMoney } from "@/lib/money"
import { cartTotals } from "../lib/cart-totals"
import { useCartStore } from "../store/cart-store-provider"
import { ManagerApprovalDialog } from "./manager-approval-dialog"
import { ParkedSalesDialog } from "./parked-sales-dialog"

const discountSteps = [0, 5, 10, 15, 20]

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
        <ColorDot color={row.variant.attributes.color} className="size-2.5" />
        {row.variant.attributes.color} · EU {row.variant.attributes.size}
        {row.entry === "manual" && <span className="text-[0.6rem] tracking-widest uppercase">· manual</span>}
      </p>
      <div className="flex items-center gap-1.5 pt-1">
        <Button
          size="icon-xs"
          variant="outline"
          className="size-8 touch-manipulation select-none active:scale-95 active:bg-accent transition-transform pointer-coarse:size-9"
          aria-label="Remove one"
          onClick={() => onQuantity(row.variantId, row.quantity - 1)}
        >
          {row.quantity === 1 ? <TrashIcon /> : <MinusIcon />}
        </Button>
        <span className="w-8 select-none text-center text-sm font-semibold tabular-nums">{row.quantity}</span>
        <Button
          size="icon-xs"
          variant="outline"
          className="size-8 touch-manipulation select-none active:scale-95 active:bg-accent transition-transform pointer-coarse:size-9"
          aria-label="Add one"
          disabled={!canAdd}
          onClick={() => onQuantity(row.variantId, row.quantity + 1)}
        >
          <PlusIcon />
        </Button>
      </div>
    </div>
    <div className="text-right text-sm tabular-nums">
      <p className="font-semibold">{formatMoney(row.total)}</p>
      {(row.discount > 0 || row.productDiscount > 0) && <p className="text-xs text-muted-foreground line-through">{formatMoney(row.gross)}</p>}
      {row.productDiscount > 0 && <p className="text-[0.6rem] font-semibold tracking-widest text-gold uppercase">on offer</p>}
    </div>
  </li>
)

export const CartPanel = ({ user, lastAdded, availableFor, onScan, onCharge, onClose, className }) => {
  const lines = useCartStore(({ lines }) => lines)
  const discountPct = useCartStore(({ discountPct }) => discountPct)
  const approvedBy = useCartStore(({ approvedBy }) => approvedBy)
  const setQuantity = useCartStore(({ setQuantity }) => setQuantity)
  const setDiscount = useCartStore(({ setDiscount }) => setDiscount)
  const clear = useCartStore(({ clear }) => clear)
  const parkSale = useCartStore(({ parkSale }) => parkSale)
  const parkedSales = useCartStore(({ parkedSales }) => parkedSales)
  const settings = useDemoStore(({ settings }) => settings)
  const [pendingDiscount, setPendingDiscount] = useState(null)
  const [parkedOpen, setParkedOpen] = useState(false)
  const catalog = useCatalog()
  const { rows, count, subtotal, discountTotal, taxRate, taxLabel, taxTotal, total } = cartTotals(lines, discountPct, catalog, settings)

  const handleDiscount = (pct) => {
    if (pct <= MAX_CASHIER_DISCOUNT * 100) return setDiscount(pct)
    if (user.role !== "cashier") return setDiscount(pct, user.id)
    setPendingDiscount(pct)
  }

  const handlePark = () => {
    if (!rows.length) return
    const parked = parkSale()
    if (parked) {
      const totalCount = parkedSales.length + 1
      toast.success("Sale placed on hold", {
        description: `Held cart with ${count} ${count === 1 ? "item" : "items"}. You now have ${totalCount} ${totalCount === 1 ? "cart" : "carts"} on hold.`,
      })
    }
  }

  return (
    <aside className={cn("flex min-h-0 flex-col bg-card", className)}>
      <div className="space-y-2.5 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-base font-semibold tracking-wider uppercase">Current sale</h2>
            {count > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-bold text-primary tabular-nums">
                {count}
              </span>
            )}
          </div>
          {onClose && (
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Close cart"
              onClick={onClose}
              className="size-8 touch-manipulation pointer-coarse:size-10"
            >
              <XIcon className="size-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!parkedSales.length}
            onClick={() => setParkedOpen(true)}
            className={cn(
              "relative h-9 w-full gap-1.5 px-2 text-xs font-medium touch-manipulation active:scale-95 pointer-coarse:h-11 transition-all",
              parkedSales.length > 0
                ? "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 font-semibold shadow-xs"
                : "text-muted-foreground opacity-50"
            )}
            title={parkedSales.length ? `${parkedSales.length} ${parkedSales.length === 1 ? "held cart" : "held carts"} waiting` : "No held sales"}
          >
            <PauseCircleIcon className="size-4 shrink-0" />
            <span>Held</span>
            {parkedSales.length > 0 && (
              <span className="flex size-4.5 min-w-4.5 items-center justify-center rounded-full bg-gold px-1 text-[0.65rem] font-bold text-black tabular-nums">
                {parkedSales.length}
              </span>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!rows.length}
            onClick={handlePark}
            className="h-9 w-full gap-1.5 px-2 text-xs font-medium touch-manipulation active:scale-95 pointer-coarse:h-11 transition-all disabled:opacity-40"
            title="Hold current sale to serve another customer"
          >
            <PauseIcon className="size-4 shrink-0 text-gold" />
            <span className="truncate">Hold</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!rows.length}
            onClick={clear}
            className="h-9 w-full gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 touch-manipulation active:scale-95 pointer-coarse:h-11 transition-all disabled:opacity-40"
            title="Clear all items from current cart"
          >
            <TrashIcon className="size-4 shrink-0" />
            <span className="truncate">Clear</span>
          </Button>
        </div>

        {parkedSales.length > 0 && (
          <button
            type="button"
            onClick={() => setParkedOpen(true)}
            className="flex w-full items-center justify-between border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs text-gold transition-colors hover:bg-gold/15 touch-manipulation"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <PauseCircleIcon className="size-4 shrink-0 text-gold" />
              <span>
                <strong className="font-bold">{parkedSales.length}</strong> {parkedSales.length === 1 ? "cart is on hold" : "carts are on hold"}
              </span>
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider underline underline-offset-2">
              View &rarr;
            </span>
          </button>
        )}

        <ScanField onScan={onScan} availableFor={availableFor} />
      </div>

      {rows.length ? (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {rows.map((row) => (
            <CartLine
              key={row.variantId}
              row={row}
              highlight={row.variantId === lastAdded}
              canAdd={availableFor(row.variantId) > 0}
              onQuantity={setQuantity}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <ShoppingBagIcon className="size-10 text-gold" weight="thin" />
          <p className="text-sm text-muted-foreground">Scan a barcode or tap a shoe to start a sale.</p>
          {parkedSales.length > 0 && (
            <div className="mt-2 flex flex-col items-center gap-2 rounded border border-gold/30 bg-gold/5 p-3">
              <p className="text-xs font-medium text-gold">
                {parkedSales.length} {parkedSales.length === 1 ? "cart is waiting on hold" : "carts are waiting on hold"}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-gold/50 bg-gold/10 text-xs font-semibold text-gold hover:bg-gold/20 touch-manipulation pointer-coarse:h-11"
                onClick={() => setParkedOpen(true)}
              >
                <PauseCircleIcon className="size-4" />
                Resume {parkedSales.length === 1 ? "held cart" : `held cart (${parkedSales.length})`}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4 border-t p-4">
        {settings.cartDiscountEnabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold tracking-[0.2em] text-muted-foreground uppercase">Discount</span>
              {approvedBy && discountPct > 5 && <span className="text-gold">Approved by manager</span>}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {discountSteps.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  disabled={!rows.length}
                  onClick={() => handleDiscount(pct)}
                  className={cn(
                    "h-8 border text-xs font-semibold tabular-nums transition-colors disabled:opacity-40 pointer-coarse:h-11",
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
            <dt>Subtotal · {count} {count === 1 ? "item" : "items"}</dt>
            <dd>{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Discount</dt>
            <dd>{discountTotal ? `− ${formatMoney(discountTotal)}` : "—"}</dd>
          </div>
          {taxTotal > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>{taxLabel || "Tax"} {taxRate ? `(${taxRate}%)` : ""}</dt>
              <dd>{formatMoney(taxTotal)}</dd>
            </div>
          )}
          <div className="flex items-end justify-between border-t pt-2">
            <dt className="text-xs font-semibold tracking-[0.2em] uppercase">Total</dt>
            <dd className="font-heading text-2xl font-bold text-gold">{formatMoney(total)}</dd>
          </div>
        </dl>

        <Button size="lg" className="h-14 w-full text-sm" disabled={!rows.length} onClick={onCharge}>
          Charge {formatMoney(total)}
          <Kbd className="ml-2 bg-primary-foreground/15 text-primary-foreground">F2</Kbd>
        </Button>
      </div>

      {pendingDiscount && (
        <ManagerApprovalDialog
          reason={`${pendingDiscount}% discount is above the ${MAX_CASHIER_DISCOUNT * 100}% cashier limit.`}
          onClose={() => setPendingDiscount(null)}
          onApprove={(managerId) => {
            setDiscount(pendingDiscount, managerId)
            setPendingDiscount(null)
          }}
        />
      )}
      {parkedOpen && <ParkedSalesDialog onClose={() => setParkedOpen(false)} />}
    </aside>
  )
}
