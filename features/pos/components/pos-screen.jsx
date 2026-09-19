"use client"

import { useEffect, useEffectEvent, useState } from "react"
import { CloudSlashIcon, LockKeyIcon, ShoppingBagIcon, SidebarSimpleIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useMediaQuery } from "@/hooks/use-media-query"
import { REGISTER_CODE } from "@/features/catalog/lib/catalog"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { openShiftFor } from "@/features/demo/lib/ledger"
import { staffName } from "@/features/demo/lib/staff"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { useBarcodeScanner } from "../hooks/use-barcode-scanner"
import { formatMoney } from "@/lib/money"
import { beep } from "../lib/beep"
import { cartTotals } from "../lib/cart-totals"
import { CartStoreProvider, useCartStore } from "../store/cart-store-provider"
import { CartPanel } from "./cart-panel"
import { CatalogPanel } from "./catalog-panel"
import { CloseShiftDialog } from "./close-shift-dialog"
import { OpenShiftCard } from "./open-shift-card"
import { PaymentDialog } from "./payment-dialog"
import { ReceiptDialog } from "./receipt-dialog"
import { ShiftReportDialog } from "./shift-report-dialog"
import { VariantPickerDialog } from "./variant-picker-dialog"

const time = new Intl.DateTimeFormat("en-PK", { hour: "numeric", minute: "2-digit" })

const screenHeight = "h-[calc(100svh-5.5rem)] md:h-[calc(100svh-6.5rem)]"

const PosSkeleton = () => (
  <div className={`grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px] ${screenHeight}`}>
    <Skeleton />
    <Skeleton className="hidden xl:block" />
  </div>
)

const PosWorkspace = ({ user, shift, onShiftClosed }) => {
  const stock = useDemoStore(({ stock }) => stock)
  const offline = useDemoStore(({ offline }) => offline)
  const waiting = useDemoStore(({ outbox }) => outbox.length)
  const catalog = useCatalog()
  const { productById, variantByBarcode } = catalog
  const recordSale = useDemoStore(({ recordSale }) => recordSale)
  const lines = useCartStore(({ lines }) => lines)
  const discountPct = useCartStore(({ discountPct }) => discountPct)
  const approvedBy = useCartStore(({ approvedBy }) => approvedBy)
  const add = useCartStore(({ add }) => add)
  const clear = useCartStore(({ clear }) => clear)
  const [picking, setPicking] = useState(null)
  const [paying, setPaying] = useState(false)
  const [completed, setCompleted] = useState(null)
  const [lastAdded, setLastAdded] = useState(null)
  const [cartOpen, setCartOpen] = useState(true)
  const [cartSheetOpen, setCartSheetOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const wide = useMediaQuery("(min-width: 1280px)")

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
    const { rows } = cartTotals(lines, discountPct, catalog)
    try {
      const sale = recordSale({
        lines: rows.map(({ variantId, quantity, discount, entry }) => ({ variantId, quantity, discount, entry })),
        payments,
        cashierId: user.id,
        shiftId: shift.id,
        approvedBy,
      })
      clear()
      setLastAdded(null)
      setPaying(false)
      setCompleted(sale)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const { total, count } = cartTotals(lines, discountPct, catalog)

  const handleCharge = () => {
    if (!lines.length) return
    setCartSheetOpen(false)
    setPaying(true)
  }

  const handleToggleCart = () => (wide ? setCartOpen((open) => !open) : setCartSheetOpen(true))

  const handleShortcut = useEffectEvent((event) => {
    if (event.key !== "F2") return
    event.preventDefault()
    handleCharge()
  })

  useEffect(() => {
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  useBarcodeScanner(handleScan)

  const cartPanel = (className, onClose) => (
    <CartPanel user={user} lastAdded={lastAdded} availableFor={availableFor} onScan={handleScan} onCharge={handleCharge} onClose={onClose} className={className} />
  )

  return (
    <div className={`flex flex-col gap-3 ${screenHeight}`}>
      {offline && (
        <div role="status" className="flex items-center gap-3 border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
          <CloudSlashIcon className="size-4 shrink-0" />
          <span>
            <span className="font-semibold">Offline.</span> Keep selling: sales are saved on this counter and sync automatically when the internet is back.
          </span>
          {waiting > 0 && <span className="ml-auto shrink-0 font-semibold tabular-nums">{waiting} waiting</span>}
        </div>
      )}
      <div className="flex items-center gap-x-5 gap-y-1 border bg-card px-3 py-2 text-xs text-muted-foreground">
        <span className="whitespace-nowrap">
          Shift since <span className="font-semibold text-foreground">{time.format(shift.openedAt)}</span>
        </span>
        <span className="hidden whitespace-nowrap xl:inline">
          Cashier <span className="font-semibold text-foreground">{staffName(shift.cashierId)}</span>
        </span>
        <span className="hidden whitespace-nowrap xl:inline">
          Counter <span className="font-semibold text-foreground">{REGISTER_CODE}</span>
        </span>
        <span className="ml-auto hidden whitespace-nowrap 2xl:inline">Scanner ready · F2 to charge</span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto shrink-0 2xl:ml-0"
          disabled={lines.length > 0}
          title={lines.length ? "Finish or clear the current sale first" : undefined}
          onClick={() => setClosing(true)}
        >
          <LockKeyIcon />
          <span className="hidden sm:inline">Close shift</span>
        </Button>
        <Button size="sm" variant={wide && cartOpen ? "outline" : "default"} className="shrink-0" onClick={handleToggleCart}>
          {wide && cartOpen ? <SidebarSimpleIcon className="-scale-x-100" /> : <ShoppingBagIcon />}
          {wide && cartOpen ? (
            "Hide cart"
          ) : (
            <>
              Cart · {count}
              <span className="hidden sm:inline"> · {formatMoney(total)}</span>
            </>
          )}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <CatalogPanel availableFor={availableFor} onPick={setPicking} />
        {wide && cartOpen && cartPanel("w-[340px] shrink-0 border")}
      </div>

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
    </div>
  )
}

export const PosScreen = ({ user }) => {
  const hydrated = useDemoStore(({ hydrated }) => hydrated)
  const shifts = useDemoStore(({ shifts }) => shifts)
  const [report, setReport] = useState(null)
  const shift = openShiftFor({ shifts })

  if (!hydrated) return <PosSkeleton />

  return (
    <>
      {shift ? (
        <CartStoreProvider>
          <PosWorkspace user={user} shift={shift} onShiftClosed={setReport} />
        </CartStoreProvider>
      ) : (
        <OpenShiftCard user={user} />
      )}
      {report && <ShiftReportDialog shift={report} onClose={() => setReport(null)} />}
    </>
  )
}
