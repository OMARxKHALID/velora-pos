"use client"

import { useEffect, useEffectEvent, useState } from "react"
import { BarcodeIcon, CloudArrowUpIcon, CloudSlashIcon, LockKeyIcon, ShoppingBagIcon, SidebarSimpleIcon, VaultIcon, WarningIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { cn } from "cn"
import { Alert, AlertAction, AlertDescription } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { useMediaQuery } from "@/shared/hooks/use-media-query"
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
import { newId } from "@/shared/lib/id"
import { formatTimeOrDate } from "@/shared/lib/dates"
import { formatMoney } from "@/shared/lib/money"
import { useBarcodeScanner } from "../hooks/use-barcode-scanner"
import { beep } from "../lib/beep"
import { notifyDiscountDropped } from "../lib/cart-notices"
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
import { ShiftReportDialog } from "./shift-report-dialog"
import { VariantPickerDialog } from "./variant-picker-dialog"
import { ReceiptDialog, preloadReceiptDialog } from "./lazy-receipt-dialog"
import { PosSkeleton, screenHeight } from "./pos-skeleton"
import { useSettingsFor } from "@/features/shops/hooks/use-shop-scope"
import { Empty, EmptyDescription } from "@/shared/components/ui/empty"

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
  const [addTick, setAddTick] = useState(0)
  const [announcement, setAnnouncement] = useState("")
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

  useEffect(preloadReceiptDialog, [])

  const inCart = new Map(lines.map(({ variantId, quantity }) => [variantId, quantity]))
  const availableFor = (variantId) => (stock[variantId] ?? 0) - (inCart.get(variantId) ?? 0)

  const handleAdd = (variant, entry) => {
    if (availableFor(variant.id) < 1) {
      beep(false, settings)
      toast.error("No more in stock", { description: `${productById[variant.productId].name} · ${sizeLabel(variant.attributes.size)}` })
      return
    }
    notifyDiscountDropped(add(variant.id, entry))
    setAnnouncement(`Added ${productById[variant.productId].name}, ${sizeLabel(variant.attributes.size)}.`)
    setLastAdded(variant.id)
    setAddTick((tick) => tick + 1)
    beep(true, settings)
  }

  const handlePick = (product) => {
    const options = (variantsByProduct[product.id] ?? []).filter(({ active }) => active)
    if (options.length === 1) handleAdd(options[0], "manual")
    else setPicking(product)
  }

  const handleScan = (code) => {
    setCompleted(null)
    const variant = variantByBarcode[code]
    if (!variant || !variant.active || productById[variant.productId].status !== "active" || productById[variant.productId].shopId !== shopId) {
      beep(false, settings)
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
      return null
    } catch (error) {
      return error.message
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
      if (lines.length) {
        const parked = await holdCart({ cart, registerId: shift.registerId })
        toast.info("Current sale held", { description: `Saved as ${parked?.label ?? "a held sale"} so you can come back to it.` })
      }
      const held = await takeHeldCart(heldId)
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
    if (event.key === "F2") {
      event.preventDefault()
      if (!overlayOpen) handleCharge()
      return
    }
    if (overlayOpen) return
    if (event.key === "F4" && lines.length) {
      event.preventDefault()
      setHoldOpen(true)
      return
    }
    if (event.key === "/" && !event.target.closest?.("input, textarea, select, [contenteditable]")) {
      event.preventDefault()
      document.querySelector('[aria-label="Search products"]')?.focus()
    }
  })

  useEffect(() => {
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  const handleScanBlocked = () => {
    beep(false, settings)
    toast.error("Close this window to scan", { description: "Scans are ignored while another window is open." })
  }

  useBarcodeScanner(handleScan, { onBlocked: handleScanBlocked })

  const cartPanel = (className, onClose) => (
    <CartPanel
      shopId={shopId}
      focusScan={scanFocus}
      lastAdded={lastAdded}
      addTick={addTick}
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

  const handleCloseShift = () => {
    if (closeBlockedReason) return toast.info("Shift can't close yet", { description: closeBlockedReason })
    setClosing(true)
  }

  return (
    <div className={`flex flex-col gap-3 ${screenHeight}`}>
      {offline && (
        <Alert variant="warning">
          <CloudSlashIcon />
          <AlertDescription>
            <span className="font-semibold">Offline.</span>{" "}
            {canSellOffline && offlineLeft > 0
              ? `Keep selling: sales are saved on this till and upload when the internet is back. ${offlineLeft} offline receipt ${offlineLeft === 1 ? "number" : "numbers"} left.`
              : canSellOffline
                ? "This till has no offline receipt numbers left. Sales can be saved again once the internet is back."
                : "Sales cannot be saved until the internet is back. Keep the cart; it is kept on this screen."}
          </AlertDescription>
        </Alert>
      )}
      {pending.length > 0 && (
        <Alert variant={failed ? "destructive" : "info"}>
          {failed ? <WarningIcon weight="fill" /> : <CloudArrowUpIcon />}
          <AlertDescription>
            {failed
              ? `${failed} ${failed === 1 ? "sale" : "sales"} saved on this till could not be uploaded.`
              : `${pending.length} ${pending.length === 1 ? "sale is" : "sales are"} saved on this till, waiting to upload.`}
          </AlertDescription>
          <AlertAction>
            <Button size="xs" variant="outline" onClick={() => setQueueOpen(true)}>
              {failed ? "Review" : "View"}
            </Button>
          </AlertAction>
        </Alert>
      )}
      <div className="flex items-center gap-x-5 gap-y-1 border bg-card px-3 py-2 text-xs text-muted-foreground">
        <span className="whitespace-nowrap">
          Shift since <span className="font-semibold text-foreground">{formatTimeOrDate(shift.openedAt)}</span>
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
            <span className="max-sm:sr-only">Open drawer</span>
          </Button>
        )}
        <Button size="sm" variant="ghost" className={cn("aria-disabled:opacity-50", register.manualDrawer ? "shrink-0" : "ml-auto shrink-0 2xl:ml-0")} aria-disabled={Boolean(closeBlockedReason)} onClick={handleCloseShift}>
          <LockKeyIcon />
          <span className="max-sm:sr-only">Close shift</span>
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
        {wide && cartOpen && cartPanel("w-[clamp(300px,30vw,380px)] shrink-0 border")}
      </div>

      {!wide && (
        <div className="flex shrink-0 items-center gap-2 border bg-card p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {heldCarts.length > 0 && <HeldCartsButton variant="mobile" count={heldCarts.length} onClick={() => setParkedOpen(true)} />}
          <Button type="button" variant="outline" size="icon-lg" className="shrink-0" aria-label="Scan or type a barcode" onClick={handleOpenScan}>
            <BarcodeIcon className="size-5 text-gold" />
          </Button>
          <button type="button" aria-label={`Open cart, ${count} ${count === 1 ? "item" : "items"}, ${formatMoney(total)}`} onClick={() => setCartSheetOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 px-2 py-1 text-left">
            <span className="relative flex size-10 shrink-0 items-center justify-center border border-primary/40 text-gold">
              <ShoppingBagIcon className="size-5" />
              {count > 0 && (
                <span key={count} className="absolute -top-1.5 -right-1.5 flex size-5 animate-in items-center justify-center bg-primary text-2xs font-bold text-primary-foreground tabular-nums duration-150 ease-snappy zoom-in-125">
                  {count}
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-muted-foreground">{count ? `${count} ${count === 1 ? "item" : "items"}` : "Cart is empty"}</span>
              <span className="block truncate font-sans text-lg font-bold text-gold tabular-nums">{formatMoney(total)}</span>
            </span>
          </button>
          <Button size="lg" className="h-12 shrink-0 px-6" disabled={!count} onClick={handleCharge}>
            Charge
          </Button>
        </div>
      )}

      {!wide && (
        <Sheet open={cartSheetOpen} onOpenChange={handleCartSheet}>
          <SheetContent data-scan-through="" side="right" showCloseButton={false} className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
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
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {completed && <ReceiptDialog sale={completed} register={register} onClose={() => setCompleted(null)} />}
      {closing && <CloseShiftDialog shift={shift} user={user} onCancel={() => setClosing(false)} onClosed={onShiftClosed} />}
      {parkedOpen && <ParkedSalesDialog shopId={shopId} heldCarts={heldCarts} onResume={handleResume} onClose={() => setParkedOpen(false)} />}
      {queueOpen && <OfflineQueueDialog onClose={() => setQueueOpen(false)} />}
      {drawerOpen && <DrawerDialog register={register} shift={shift} onClose={() => setDrawerOpen(false)} />}
      {holdOpen && <HoldSaleDialog suggestion={customerName || `Order #${heldCarts.length + 1}`} onHold={handleHold} onClose={() => setHoldOpen(false)} />}
    </div>
  )
}

export const PosScreen = ({ user }) => {
  const hydrated = useLedgerStore(({ hydrated }) => hydrated)
  const shifts = useLedgerStore(({ shifts }) => shifts)
  const [report, setReport] = useState(null)
  const counter = useCounter(user)
  const shift = counter.register ? openShiftFor({ shifts }, counter.register.id) : null

  if (!hydrated) return <PosSkeleton />
  if (!counter.register) return <Empty className="py-16"><EmptyDescription>This shop has no counter yet. Ask the owner to add one in Settings, Shops.</EmptyDescription></Empty>

  return (
    <>
      {!shift && <OpenShiftCard user={user} counter={counter} />}
      {shift && shift.cashierId !== user.id && <CounterBusyCard shift={shift} onClosed={setReport} />}
      {shift?.cashierId === user.id && (
        <CartStoreProvider>
          <PosWorkspace user={user} shift={shift} register={counter.register} shopId={counter.shopId} onShiftClosed={setReport} />
        </CartStoreProvider>
      )}
      {report && <ShiftReportDialog shift={report} onClose={() => setReport(null)} />}
    </>
  )
}
