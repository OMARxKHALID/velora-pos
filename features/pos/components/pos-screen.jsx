"use client"

import { useEffect, useEffectEvent, useState } from "react"
import { BarcodeIcon, CloudArrowUpIcon, CloudSlashIcon, LockKeyIcon, ShoppingBagIcon, SidebarSimpleIcon, VaultIcon, WarningIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useMediaQuery } from "@/hooks/use-media-query"
import { sizeLabel } from "@/features/catalog/lib/catalog"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { openShiftFor } from "@/features/ledger/lib/rules"
import { useCounter } from "../hooks/use-counter"
import { OfflineQueueDialog } from "@/features/offline/components/offline-queue-dialog"
import { heldAt } from "../lib/held-carts"
import { numbersLeft } from "../lib/receipts"
import { fitToStock } from "../lib/cart-fit"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { cartTotals } from "@/features/pricing/lib/pricing"
import { newId } from "@/lib/id"
import { formatTime } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { useBarcodeScanner } from "../hooks/use-barcode-scanner"
import { beep } from "../lib/beep"
import { CartStoreProvider, useCartStore } from "../store/cart-store-provider"
import { CartPanel } from "./cart-panel"
import { CatalogPanel } from "./catalog-panel"
import { CloseShiftDialog } from "./close-shift-dialog"
import { CounterBusyCard } from "./counter-busy-card"
import { DrawerDialog } from "./drawer-dialog"
import { HeldCartsButton } from "./held-carts-button"
import { HoldSaleDialog } from "./hold-sale-dialog"
import { OpenShiftCard } from "./open-shift-card"
import { ParkedSalesDialog } from "./parked-sales-dialog"
import { PaymentDialog } from "./payment-dialog"
import { ReceiptDialog } from "./receipt-dialog"
import { ShiftReportDialog } from "./shift-report-dialog"
import { VariantPickerDialog } from "./variant-picker-dialog"
import { useSettingsFor } from "@/features/shops/hooks/use-shop-scope"

const screenHeight = "h-[calc(100dvh-var(--app-header-h)-2*var(--app-page-pad))] min-h-[34rem]"

const PosSkeleton = () => (
  <div className={`grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] ${screenHeight}`}>
    <Skeleton />
    <Skeleton className="hidden lg:block" />
  </div>
)

const PosWorkspace = ({ user, shift, register, shopId, onShiftClosed }) => {
  const stock = useLedgerStore(({ stock }) => stock)
  const offline = useLedgerStore(({ offline }) => offline)
  const canSellOffline = useLedgerStore(({ canSellOffline }) => canSellOffline)
  const pending = useLedgerStore(({ pending }) => pending)
  const receiptsUsed = useLedgerStore(({ receiptsUsed }) => receiptsUsed)
  const settings = useSettingsFor(shopId)
  const recordSale = useLedgerStore(({ recordSale }) => recordSale)
  const allHeld = useLedgerStore(({ heldCarts }) => heldCarts)
  const holdCart = useLedgerStore(({ holdCart }) => holdCart)
  const takeHeldCart = useLedgerStore(({ takeHeldCart }) => takeHeldCart)
  const catalog = useCatalog()
  const { productById, variantByBarcode, variants, variantsByProduct } = catalog
  const nameOf = useStaffName()

  const lines = useCartStore(({ lines }) => lines)
  const discountPct = useCartStore(({ discountPct }) => discountPct)
  const approvedBy = useCartStore(({ approvedBy }) => approvedBy)
  const approvalToken = useCartStore(({ approvalToken }) => approvalToken)
  const customerName = useCartStore(({ customerName }) => customerName)
  const customerPhone = useCartStore(({ customerPhone }) => customerPhone)
  const add = useCartStore(({ add }) => add)
  const clear = useCartStore(({ clear }) => clear)
  const load = useCartStore(({ load }) => load)
  const prune = useCartStore(({ prune }) => prune)
  const heldCarts = heldAt(allHeld, shift.registerId)

  const [picking, setPicking] = useState(null)
  const [paying, setPaying] = useState(false)
  const [completed, setCompleted] = useState(null)
  const [lastAdded, setLastAdded] = useState(null)
  const [cartOpen, setCartOpen] = useState(true)
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const [scanFocus, setScanFocus] = useState(false)
  const [closing, setClosing] = useState(false)
  const [parkedOpen, setParkedOpen] = useState(false)
  const [holdOpen, setHoldOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [checkoutId, setCheckoutId] = useState(newId)
  const wide = useMediaQuery("(min-width: 1024px)")

  useEffect(() => {
    prune(new Set(variants.map(({ id }) => id)))
  }, [variants, prune])


  const availableFor = (variantId) => (stock[variantId] ?? 0) - (lines.find((line) => line.variantId === variantId)?.quantity ?? 0)

  const handleAdd = (variant, entry) => {
    if (availableFor(variant.id) < 1) {
      beep(false)
      toast.error("No more in stock", { description: `${productById[variant.productId].name} · ${sizeLabel(variant.attributes.size)}` })
      return
    }
    add(variant.id, entry)
    setLastAdded(variant.id)
    beep(true)
  }

  const handlePick = (product) => {
    const options = (variantsByProduct[product.id] ?? []).filter(({ active }) => active)
    if (options.length === 1) handleAdd(options[0], "manual")
    else setPicking(product)
  }

  const handleScan = (code) => {
    const variant = variantByBarcode[code]
    if (!variant || !variant.active || productById[variant.productId].status !== "active" || productById[variant.productId].shopId !== shopId) {
      beep(false)
      toast.error("Barcode not found", { description: code })
      return
    }
    handleAdd(variant, "scan")
  }

  const handlePay = async (payments) => {
    try {
      const sale = await recordSale({
        clientId: checkoutId,
        shiftId: shift.id,
        lines: lines.map(({ variantId, quantity, entry }) => ({ variantId, quantity, entry })),
        discountPct,
        approvedBy,
        approvalToken,
        payments,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
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

  const handleCartSheet = (open) => {
    setCartSheetOpen(open)
    if (!open) setScanFocus(false)
  }

  const handleOpenScan = () => {
    setScanFocus(true)
    setCartSheetOpen(true)
  }

  const handleCharge = () => {
    if (!lines.length) return
    handleCartSheet(false)
    setPaying(true)
  }

  const cart = { lines, discountPct, approvedBy, approvalToken, customerName, customerPhone }

  const handleHold = async (label) => {
    setHoldOpen(false)
    if (!lines.length) return
    try {
      const held = await holdCart({ cart, label, registerId: shift.registerId })
      clear()
      const count = heldCarts.length + 1
      toast.success("Sale on hold", { description: `${held.label}. ${count} ${count === 1 ? "cart is" : "carts are"} on hold.` })
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleResume = async (heldId) => {
    setParkedOpen(false)
    try {
      const held = await takeHeldCart(heldId)
      if (lines.length) await holdCart({ cart, registerId: shift.registerId })
      const { lines: fitted, adjusted } = fitToStock(held.lines, stock)
      load({ ...held, lines: fitted })
      if (adjusted.length) {
        toast.warning("Some items were trimmed", { description: "Stock changed while this sale was on hold, so quantities were reduced to what is left." })
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleToggleCart = () => (wide ? setCartOpen((open) => !open) : setCartSheetOpen(true))

  const overlayOpen = Boolean(picking || paying || completed || closing || parkedOpen || holdOpen || queueOpen || drawerOpen)

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
      shopId={shopId}
      focusScan={scanFocus}
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

  const waiting = pending.filter(({ shiftId }) => shiftId === shift.id)
  const failed = pending.filter(({ status }) => status === "failed").length
  const offlineLeft = numbersLeft(shift.receiptBlocks, Math.max(receiptsUsed[shift.id] ?? 0, shift.offlineNext ?? 0))
  const closeBlockedReason = lines.length
    ? "Finish or clear the current sale first"
    : heldCarts.length
      ? "Resume or discard held carts first"
      : waiting.some(({ status }) => status === "failed")
        ? "Review the sales that could not be uploaded first"
        : waiting.length
          ? "Wait for the sales saved on this till to upload"
          : undefined

  return (
    <div className={`flex flex-col gap-3 ${screenHeight}`}>
      {offline && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <CloudSlashIcon className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">Offline.</span>{" "}
            {canSellOffline && offlineLeft > 0
              ? `Keep selling: sales are saved on this till and upload when the internet is back. ${offlineLeft} offline receipt ${offlineLeft === 1 ? "number" : "numbers"} left.`
              : canSellOffline
                ? "This till has no offline receipt numbers left. Sales can be saved again once the internet is back."
                : "Sales cannot be saved until the internet is back. Keep the cart; it is kept on this screen."}
          </span>
        </div>
      )}
      {pending.length > 0 && (
        <div
          role="status"
          className={`flex flex-wrap items-center gap-x-3 gap-y-2 border px-3 py-2 text-xs ${failed ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-info/40 bg-info/10 text-info"}`}
        >
          {failed ? <WarningIcon className="size-4 shrink-0" weight="fill" /> : <CloudArrowUpIcon className="size-4 shrink-0" />}
          <span className="min-w-0 flex-1">
            {failed
              ? `${failed} ${failed === 1 ? "sale" : "sales"} saved on this till could not be uploaded.`
              : `${pending.length} ${pending.length === 1 ? "sale is" : "sales are"} saved on this till, waiting to upload.`}
          </span>
          <Button size="sm" variant="outline" className="h-7" onClick={() => setQueueOpen(true)}>
            {failed ? "Review" : "View"}
          </Button>
        </div>
      )}
      <div className="flex items-center gap-x-5 gap-y-1 border bg-card px-3 py-2 text-xs text-muted-foreground">
        <span className="whitespace-nowrap">
          Shift since <span className="font-semibold text-foreground">{formatTime(shift.openedAt)}</span>
        </span>
        <span className="hidden whitespace-nowrap xl:inline">
          Cashier <span className="font-semibold text-foreground">{nameOf(shift.cashierId)}</span>
        </span>
        <span className="hidden whitespace-nowrap xl:inline">
          Counter <span className="font-semibold text-foreground">{shift.registerCode}</span>
        </span>
        <span className="ml-auto hidden whitespace-nowrap 2xl:inline pointer-coarse:hidden">Scanner ready · F2 to charge</span>
        {register.manualDrawer && (
          <Button size="sm" variant="ghost" className="ml-auto shrink-0 2xl:ml-0" onClick={() => setDrawerOpen(true)}>
            <VaultIcon />
            <span className="hidden sm:inline">Open drawer</span>
          </Button>
        )}
        <Button size="sm" variant="ghost" className={register.manualDrawer ? "shrink-0" : "ml-auto shrink-0 2xl:ml-0"} disabled={Boolean(closeBlockedReason)} title={closeBlockedReason} onClick={() => setClosing(true)}>
          <LockKeyIcon />
          <span className="hidden sm:inline">Close shift</span>
        </Button>
        {wide && !cartOpen && heldCarts.length > 0 && <HeldCartsButton variant="bar" count={heldCarts.length} onClick={() => setParkedOpen(true)} />}
        {wide && (
          <Button size="sm" variant={cartOpen ? "outline" : "default"} className="shrink-0" onClick={handleToggleCart}>
            {cartOpen ? <SidebarSimpleIcon className="-scale-x-100" /> : <ShoppingBagIcon />}
            {cartOpen ? "Hide cart" : `Cart · ${count} · ${formatMoney(total)}`}
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <CatalogPanel shopId={shopId} availableFor={availableFor} onPick={handlePick} onScan={handleScan} />
        {wide && cartOpen && cartPanel("w-[340px] shrink-0 border")}
      </div>

      {!wide && (
        <div className="flex shrink-0 items-center gap-2 border bg-card p-2">
          {heldCarts.length > 0 && <HeldCartsButton variant="mobile" count={heldCarts.length} onClick={() => setParkedOpen(true)} />}
          <Button type="button" variant="outline" size="icon-lg" className="shrink-0" aria-label="Scan or type a barcode" onClick={handleOpenScan}>
            <BarcodeIcon className="size-5 text-gold" />
          </Button>
          <button type="button" onClick={() => setCartSheetOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-1 text-left">
            <span className="relative flex size-10 shrink-0 items-center justify-center border border-primary/40 text-gold">
              <ShoppingBagIcon className="size-5" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center bg-primary text-2xs font-bold text-primary-foreground tabular-nums">{count}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">{count ? `${count} ${count === 1 ? "item" : "items"}` : "Cart is empty"}</span>
              <span className="block font-sans text-lg font-bold text-gold tabular-nums">{formatMoney(total)}</span>
            </span>
          </button>
          <Button size="lg" className="h-12 shrink-0 px-6" disabled={!count} onClick={handleCharge}>
            Charge
          </Button>
        </div>
      )}

      {!wide && (
        <Sheet open={cartSheetOpen} onOpenChange={handleCartSheet}>
          <SheetContent side="right" showCloseButton={false} className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
            <SheetHeader className="sr-only">
              <SheetTitle>Cart</SheetTitle>
              <SheetDescription>Items in the current sale</SheetDescription>
            </SheetHeader>
            {cartPanel("h-full", () => handleCartSheet(false))}
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
      {paying && <PaymentDialog shopId={shopId} total={total} count={count} onPay={handlePay} onClose={() => setPaying(false)} />}
      {completed && <ReceiptDialog sale={completed} register={register} onClose={() => setCompleted(null)} />}
      {closing && <CloseShiftDialog shift={shift} user={user} onCancel={() => setClosing(false)} onClosed={onShiftClosed} />}
      {parkedOpen && <ParkedSalesDialog heldCarts={heldCarts} onResume={handleResume} onClose={() => setParkedOpen(false)} />}
      {queueOpen && <OfflineQueueDialog onClose={() => setQueueOpen(false)} />}
      {drawerOpen && <DrawerDialog register={register} shift={shift} user={user} onClose={() => setDrawerOpen(false)} />}
      {holdOpen && <HoldSaleDialog suggestion={customerName || `Order #${heldCarts.length + 1}`} onHold={handleHold} onClose={() => setHoldOpen(false)} />}
    </div>
  )
}

export const PosScreen = ({ user }) => {
  const hydrated = useLedgerStore(({ hydrated }) => hydrated)
  const shifts = useLedgerStore(({ shifts }) => shifts)
  const epoch = useLedgerStore(({ epoch }) => epoch)
  const [report, setReport] = useState(null)
  const counter = useCounter(user)
  const shift = counter.register ? openShiftFor({ shifts }, counter.register.id) : null

  if (!hydrated) return <PosSkeleton />
  if (!counter.register) return <p className="py-16 text-center text-sm text-muted-foreground">This shop has no counter yet. Ask the owner to add one in Settings, Shops.</p>

  return (
    <>
      {!shift && <OpenShiftCard user={user} counter={counter} />}
      {shift && shift.cashierId !== user.id && <CounterBusyCard shift={shift} onClosed={setReport} />}
      {shift?.cashierId === user.id && (
        <CartStoreProvider key={epoch}>
          <PosWorkspace user={user} shift={shift} register={counter.register} shopId={counter.shopId} onShiftClosed={setReport} />
        </CartStoreProvider>
      )}
      {report && <ShiftReportDialog shift={report} onClose={() => setReport(null)} />}
    </>
  )
}
