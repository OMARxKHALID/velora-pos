"use client"

import { useEffect, useEffectEvent, useState } from "react"
import { ArrowsClockwiseIcon, CloudSlashIcon, LockKeyIcon, ShoppingBagIcon, SidebarSimpleIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useMediaQuery } from "@/hooks/use-media-query"
import { REGISTER_CODE } from "@/features/catalog/lib/catalog"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { useStaffName } from "@/features/demo/hooks/use-directory"
import { useSyncNow } from "@/features/demo/hooks/use-sync-now"
import { openShiftFor } from "@/features/demo/lib/ledger"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { cartTotals } from "@/features/pricing/lib/pricing"
import { newId } from "@/lib/id"
import { formatMoney } from "@/lib/money"
import { useBarcodeScanner } from "../hooks/use-barcode-scanner"
import { beep } from "../lib/beep"
import { CartStoreProvider, useCartStore } from "../store/cart-store-provider"
import { CartPanel } from "./cart-panel"
import { CatalogPanel } from "./catalog-panel"
import { CloseShiftDialog } from "./close-shift-dialog"
import { CounterBusyCard } from "./counter-busy-card"
import { HeldCartsButton } from "./held-carts-button"
import { HoldSaleDialog } from "./hold-sale-dialog"
import { OpenShiftCard } from "./open-shift-card"
import { ParkedSalesDialog } from "./parked-sales-dialog"
import { PaymentDialog } from "./payment-dialog"
import { ReceiptDialog } from "./receipt-dialog"
import { ShiftReportDialog } from "./shift-report-dialog"
import { VariantPickerDialog } from "./variant-picker-dialog"

const time = new Intl.DateTimeFormat("en-PK", { hour: "numeric", minute: "2-digit" })

// Fills the space under the app header (see --app-header-h / --app-page-pad in globals.css). It never gets shorter than
// min-h, so on a landscape phone the page scrolls instead of squeezing the product grid down to nothing.
const screenHeight = "h-[calc(100dvh-var(--app-header-h)-2*var(--app-page-pad))] min-h-[34rem]"

const PosSkeleton = () => (
  <div className={`grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] ${screenHeight}`}>
    <Skeleton />
    <Skeleton className="hidden lg:block" />
  </div>
)

const PosWorkspace = ({ user, shift, onShiftClosed }) => {
  const stock = useDemoStore(({ stock }) => stock)
  const offline = useDemoStore(({ offline }) => offline)
  const waiting = useDemoStore(({ outbox }) => outbox.length)
  const settings = useDemoStore(({ settings }) => settings)
  const recordSale = useDemoStore(({ recordSale }) => recordSale)
  const catalog = useCatalog()
  const { productById, variantByBarcode, variants } = catalog
  const nameOf = useStaffName()
  const syncNow = useSyncNow()

  const lines = useCartStore(({ lines }) => lines)
  const discountPct = useCartStore(({ discountPct }) => discountPct)
  const approvedBy = useCartStore(({ approvedBy }) => approvedBy)
  const customerName = useCartStore(({ customerName }) => customerName)
  const customerPhone = useCartStore(({ customerPhone }) => customerPhone)
  const parkedSales = useCartStore(({ parkedSales }) => parkedSales)
  const add = useCartStore(({ add }) => add)
  const clear = useCartStore(({ clear }) => clear)
  const parkSale = useCartStore(({ parkSale }) => parkSale)
  const resumeSale = useCartStore(({ resumeSale }) => resumeSale)
  const prune = useCartStore(({ prune }) => prune)

  const [picking, setPicking] = useState(null)
  const [paying, setPaying] = useState(false)
  const [completed, setCompleted] = useState(null)
  const [lastAdded, setLastAdded] = useState(null)
  const [cartOpen, setCartOpen] = useState(true)
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [parkedOpen, setParkedOpen] = useState(false)
  const [holdOpen, setHoldOpen] = useState(false)
  // One id per checkout, so pressing Pay twice can never record the same sale twice.
  const [checkoutId, setCheckoutId] = useState(newId)
  const wide = useMediaQuery("(min-width: 1024px)")

  // A restored cart can point at items that no longer exist (for example after the demo data was reset).
  useEffect(() => {
    prune(new Set(variants.map(({ id }) => id)))
  }, [variants, prune])

  const availableFor = (variantId) => (stock[variantId] ?? 0) - (lines.find((line) => line.variantId === variantId)?.quantity ?? 0)

  const handleAdd = (variant, entry) => {
    if (availableFor(variant.id) < 1) {
      beep(false)
      toast.error("No more in stock", { description: `${productById[variant.productId].name} · EU ${variant.attributes.size}` })
      return
    }
    add(variant.id, entry)
    setLastAdded(variant.id)
    beep(true)
  }

  const handleScan = (code) => {
    const variant = variantByBarcode[code]
    if (!variant || !variant.active || productById[variant.productId].status !== "active") {
      beep(false)
      toast.error("Barcode not found", { description: code })
      return
    }
    handleAdd(variant, "scan")
  }

  const handlePay = (payments) => {
    const { rows } = cartTotals(lines, discountPct, catalog, settings)
    try {
      const sale = recordSale({
        clientId: checkoutId,
        lines: rows.map(({ variantId, quantity, discount, productDiscount, entry }) => ({ variantId, quantity, discount, productDiscount, entry })),
        payments,
        cashierId: user.id,
        shiftId: shift.id,
        approvedBy,
        customerName,
        customerPhone,
      })
      clear()
      setCheckoutId(newId())
      setLastAdded(null)
      setPaying(false)
      setCompleted(sale)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const { total, count } = cartTotals(lines, discountPct, catalog, settings)

  const handleCharge = () => {
    if (!lines.length) return
    setCartSheetOpen(false)
    setPaying(true)
  }

  const handleHold = (label) => {
    const parked = parkSale(label)
    setHoldOpen(false)
    if (!parked) return
    toast.success("Sale on hold", { description: `${parked.label}. ${parkedSales.length + 1} ${parkedSales.length === 0 ? "cart is" : "carts are"} on hold.` })
  }

  const handleResume = (parkedId) => {
    const result = resumeSale(parkedId, stock)
    setParkedOpen(false)
    if (result?.adjusted.length) {
      toast.warning("Some items were trimmed", { description: "Stock changed while this sale was on hold, so quantities were reduced to what is left." })
    }
  }

  const handleToggleCart = () => (wide ? setCartOpen((open) => !open) : setCartSheetOpen(true))

  const overlayOpen = Boolean(picking || paying || completed || closing || parkedOpen || holdOpen)

  const handleShortcut = useEffectEvent((event) => {
    if (event.key !== "F2") return
    event.preventDefault()
    if (!overlayOpen) handleCharge()
  })

  useEffect(() => {
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  useBarcodeScanner(handleScan)

  const cartPanel = (className, onClose) => (
    <CartPanel
      user={user}
      lastAdded={lastAdded}
      availableFor={availableFor}
      onScan={handleScan}
      onCharge={handleCharge}
      onHold={() => setHoldOpen(true)}
      onOpenHeld={() => setParkedOpen(true)}
      onClose={onClose}
      className={className}
    />
  )

  const closeBlockedReason = lines.length ? "Finish or clear the current sale first" : parkedSales.length ? "Resume or discard held carts first" : undefined

  return (
    <div className={`flex flex-col gap-3 ${screenHeight}`}>
      {offline && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <CloudSlashIcon className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">Offline.</span> Keep selling: sales are saved on this counter and sync automatically when the internet is back.
          </span>
          {waiting > 0 && <span className="shrink-0 font-semibold tabular-nums">{waiting} waiting</span>}
          <Button size="xs" variant="outline" className="shrink-0 border-warning/40" onClick={syncNow}>
            <ArrowsClockwiseIcon />
            {waiting > 0 ? "Sync now" : "Reconnect"}
          </Button>
        </div>
      )}
      {!offline && waiting > 0 && (
        <div role="status" className="flex items-center gap-3 border border-info/40 bg-info/10 px-3 py-2 text-xs text-info">
          <ArrowsClockwiseIcon className="size-4 shrink-0 animate-spin" />
          <span>
            <span className="font-semibold">Reconnected.</span> Syncing {waiting} offline {waiting === 1 ? "sale" : "sales"}…
          </span>
          <span className="ml-auto shrink-0 font-semibold tabular-nums">{waiting} syncing</span>
        </div>
      )}
      <div className="flex items-center gap-x-5 gap-y-1 border bg-card px-3 py-2 text-xs text-muted-foreground">
        <span className="whitespace-nowrap">
          Shift since <span className="font-semibold text-foreground">{time.format(shift.openedAt)}</span>
        </span>
        <span className="hidden whitespace-nowrap xl:inline">
          Cashier <span className="font-semibold text-foreground">{nameOf(shift.cashierId)}</span>
        </span>
        <span className="hidden whitespace-nowrap xl:inline">
          Counter <span className="font-semibold text-foreground">{REGISTER_CODE}</span>
        </span>
        <span className="ml-auto hidden whitespace-nowrap 2xl:inline">Scanner ready · F2 to charge</span>
        <Button size="sm" variant="ghost" className="ml-auto shrink-0 2xl:ml-0" disabled={Boolean(closeBlockedReason)} title={closeBlockedReason} onClick={() => setClosing(true)}>
          <LockKeyIcon />
          <span className="hidden sm:inline">Close shift</span>
        </Button>
        {wide && !cartOpen && parkedSales.length > 0 && <HeldCartsButton variant="bar" count={parkedSales.length} onClick={() => setParkedOpen(true)} />}
        {wide && (
          <Button size="sm" variant={cartOpen ? "outline" : "default"} className="shrink-0" onClick={handleToggleCart}>
            {cartOpen ? <SidebarSimpleIcon className="-scale-x-100" /> : <ShoppingBagIcon />}
            {cartOpen ? "Hide cart" : `Cart · ${count} · ${formatMoney(total)}`}
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <CatalogPanel availableFor={availableFor} onPick={setPicking} />
        {wide && cartOpen && cartPanel("w-[340px] shrink-0 border")}
      </div>

      {!wide && (
        <div className="flex shrink-0 items-center gap-2 border bg-card p-2">
          {parkedSales.length > 0 && <HeldCartsButton variant="mobile" count={parkedSales.length} onClick={() => setParkedOpen(true)} />}
          <button type="button" onClick={() => setCartSheetOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-1 text-left">
            <span className="relative flex size-10 shrink-0 items-center justify-center border border-primary/40 text-gold">
              <ShoppingBagIcon className="size-5" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center bg-primary text-2xs font-bold text-primary-foreground tabular-nums">{count}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">{count ? `${count} ${count === 1 ? "item" : "items"} · tap to view` : "Cart is empty"}</span>
              <span className="block font-heading text-lg font-bold text-gold tabular-nums">{formatMoney(total)}</span>
            </span>
          </button>
          <Button size="lg" className="h-12 shrink-0 px-6" disabled={!count} onClick={handleCharge}>
            Charge
          </Button>
        </div>
      )}

      {!wide && (
        <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
          <SheetContent side="right" showCloseButton={false} className="w-full gap-0 p-0 sm:max-w-md">
            <SheetHeader className="sr-only">
              <SheetTitle>Cart</SheetTitle>
              <SheetDescription>Items in the current sale</SheetDescription>
            </SheetHeader>
            {cartPanel("h-full", () => setCartSheetOpen(false))}
          </SheetContent>
        </Sheet>
      )}

      {picking && (
        <VariantPickerDialog
          product={picking}
          availableFor={availableFor}
          onClose={() => setPicking(null)}
          onChoose={(variant) => {
            handleAdd(variant, "manual")
            setPicking(null)
          }}
        />
      )}
      {paying && <PaymentDialog total={total} count={count} onPay={handlePay} onClose={() => setPaying(false)} />}
      {completed && <ReceiptDialog sale={completed} onClose={() => setCompleted(null)} />}
      {closing && <CloseShiftDialog shift={shift} user={user} onCancel={() => setClosing(false)} onClosed={onShiftClosed} />}
      {parkedOpen && <ParkedSalesDialog onResume={handleResume} onClose={() => setParkedOpen(false)} />}
      {holdOpen && <HoldSaleDialog suggestion={customerName || `Order #${parkedSales.length + 1}`} onHold={handleHold} onClose={() => setHoldOpen(false)} />}
    </div>
  )
}

export const PosScreen = ({ user }) => {
  const hydrated = useDemoStore(({ hydrated }) => hydrated)
  const shifts = useDemoStore(({ shifts }) => shifts)
  const epoch = useDemoStore(({ epoch }) => epoch)
  const [report, setReport] = useState(null)
  const shift = openShiftFor({ shifts })

  if (!hydrated) return <PosSkeleton />

  return (
    <>
      {!shift && <OpenShiftCard user={user} />}
      {shift && shift.cashierId !== user.id && <CounterBusyCard user={user} shift={shift} onClosed={setReport} />}
      {shift?.cashierId === user.id && (
        <CartStoreProvider key={epoch}>
          <PosWorkspace user={user} shift={shift} onShiftClosed={setReport} />
        </CartStoreProvider>
      )}
      {report && <ShiftReportDialog shift={report} onClose={() => setReport(null)} />}
    </>
  )
}
