"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { BarcodeIcon, CheckCircleIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button, buttonVariants } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { StatStrip } from "@/components/ui/stat-strip"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { useBarcodeScanner } from "@/features/pos/hooks/use-barcode-scanner"
import { beep } from "@/features/pos/lib/beep"
import { sumBy } from "@/lib/money"
import { compareSizes, countOf, sizeLabel, unitOf } from "@/features/catalog/lib/catalog"

const bySize = (a, b) => compareSizes(a.attributes.size, b.attributes.size)

const Stepper = ({ value, onChange }) => (
  <div className="flex items-center gap-1">
    <Button type="button" size="icon-xs" variant="outline" aria-label="One less" disabled={value < 1} onClick={() => onChange(value - 1)}>
      <MinusIcon />
    </Button>
    <span className="w-8 text-center font-semibold tabular-nums">{value}</span>
    <Button type="button" size="icon-xs" variant="outline" aria-label="One more" onClick={() => onChange(value + 1)}>
      <PlusIcon />
    </Button>
  </div>
)

export const StockCountScreen = ({ user }) => {
  const stock = useLedgerStore(({ stock }) => stock)
  const countStock = useLedgerStore(({ countStock }) => countStock)
  const categories = useLedgerStore(({ categories }) => categories)
  const { productById, variantByBarcode, variantsByProduct, variants: allVariants } = useCatalog()
  const shopId = useShopScope(user)
  const variants = allVariants.filter(({ productId }) => productById[productId]?.shopId === shopId)
  const [code, setCode] = useState("")
  const [counts, setCounts] = useState({})
  const [productIds, setProductIds] = useState([])
  const [lastScanned, setLastScanned] = useState(null)
  const [reviewing, setReviewing] = useState(false)
  const [saved, setSaved] = useState(null)

  const handleScan = (barcode) => {
    const variant = variantByBarcode[barcode]
    if (!variant?.active || productById[variant.productId]?.status !== "active" || productById[variant.productId]?.shopId !== shopId) {
      beep(false)
      toast.error("Barcode not found", { description: barcode })
      return
    }
    beep(true)
    setProductIds((ids) => (ids.includes(variant.productId) ? ids : [variant.productId, ...ids]))
    setCounts((current) => ({ ...current, [variant.id]: (current[variant.id] ?? 0) + 1 }))
    setLastScanned(variant.id)
  }

  useBarcodeScanner(handleScan)

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || !code.trim()) return
    handleScan(code.trim())
    setCode("")
  }

  const handleTestScan = () => {
    const onShelf = variants.filter(({ id, active }) => active && (stock[id] ?? 0) > 0)
    if (onShelf.length) handleScan(onShelf[Math.floor(Math.random() * onShelf.length)].barcode)
  }

  const handleSetCount = (variantId, value) => setCounts((current) => ({ ...current, [variantId]: Math.max(0, value) }))

  const groups = productIds.map((productId) => ({
    product: productById[productId],
    sizes: (variantsByProduct[productId] ?? [])
      .filter(({ active }) => active)
      .toSorted((a, b) => a.attributes.color.localeCompare(b.attributes.color) || bySize(a, b))
      .map((variant) => ({ variant, counted: counts[variant.id] ?? 0, expected: stock[variant.id] ?? 0 })),
  }))
  const lines = groups.flatMap(({ sizes }) => sizes)
  const differing = lines.filter(({ counted, expected }) => counted !== expected)

  const handleDiscard = (event) => {
    if (lines.length && !window.confirm("Throw away this count?")) event.preventDefault()
  }

  const handleSave = () => {
    try {
      const { changed } = countStock({ counts: lines.map(({ variant, counted }) => ({ variantId: variant.id, counted })), userId: user.id })
      setSaved({ changed, shoes: groups.length, pairs: sumBy(lines, ({ counted }) => counted) })
      setCounts({})
      setProductIds([])
      setReviewing(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (saved)
    return (
      <div className="flex flex-col items-center gap-3 border bg-card px-6 py-16 text-center shadow-xs dark:shadow-md dark:shadow-black/30">
        <CheckCircleIcon className="size-10 text-success" />
        <p className="text-base font-semibold">Stock count saved</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {saved.pairs} items across {saved.shoes} {saved.shoes === 1 ? "product" : "products"}.{" "}
          {saved.changed ? `${saved.changed} ${saved.changed === 1 ? "size was" : "sizes were"} corrected and logged in Stock history.` : "Everything matched the system."}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setSaved(null)}>
            Count another shelf
          </Button>
          <Link href="/stock" className={buttonVariants({ size: "sm" })}>
            Back to stock
          </Link>
        </div>
      </div>
    )

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <InputGroup className="h-11 w-full @xl:w-96">
          <InputGroupAddon>
            <BarcodeIcon className="text-gold" />
          </InputGroupAddon>
          <InputGroupInput
            value={code}
            autoFocus
            inputMode="numeric"
            disabled={reviewing}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            onKeyDown={handleKeyDown}
            placeholder="Scan each item, then Enter"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="xs" variant="ghost" disabled={reviewing} onClick={handleTestScan}>
              Test scan
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <div className="flex w-full gap-2 @2xl:ml-auto @2xl:w-auto">
          <Link href="/stock" onClick={handleDiscard} className={buttonVariants({ size: "sm", variant: "outline", className: "flex-1 @2xl:flex-none" })}>
            Cancel
          </Link>
          {reviewing ? (
            <>
              <Button size="sm" variant="outline" className="flex-1 @2xl:flex-none" onClick={() => setReviewing(false)}>
                Keep counting
              </Button>
              <Button size="sm" className="flex-1 @2xl:flex-none" onClick={handleSave}>
                Save count
              </Button>
            </>
          ) : (
            <Button size="sm" className="flex-1 @2xl:flex-none" disabled={!lines.length} onClick={() => setReviewing(true)}>
              Review differences
            </Button>
          )}
        </div>
      </div>

      <StatStrip
        stats={[
          { label: "Products", value: groups.length },
          { label: "Items counted", value: sumBy(lines, ({ counted }) => counted) },
          { label: "Sizes", value: lines.length },
          reviewing
            ? { label: "Sizes that differ", value: differing.length, tone: differing.length ? "warning" : undefined }
            : { label: "System numbers", value: "Hidden", hint: <span>Shown when you review</span> },
        ]}
      />

      {!groups.length ? (
        <div className="flex flex-col items-center gap-3 border border-dashed bg-card px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center border border-primary/40 text-gold">
            <BarcodeIcon className="size-6" />
          </span>
          <p className="font-medium">Scan the first item on the shelf</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Every product you scan is counted in full. Sizes of that product you do not scan count as zero, so finish a shelf before you review.
          </p>
          <Link href="/stock" className={buttonVariants({ variant: "link", size: "xs" })}>
            Back to stock
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 @4xl:grid-cols-2">
          {groups.map(({ product, sizes }) => (
            <section key={product.id} className="border bg-card shadow-xs dark:shadow-md dark:shadow-black/30">
              <header className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
                <h2 className="truncate text-base font-semibold">{product.name}</h2>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{countOf(sumBy(sizes, ({ counted }) => counted), unitOf(categories, product.category))}</span>
              </header>
              <ul className="divide-y">
                {sizes
                  .filter(({ counted, expected }) => !reviewing || counted !== expected)
                  .map(({ variant, counted, expected }) => {
                    const diff = counted - expected
                    return (
                      <li key={variant.id} className={cn("flex items-center gap-3 px-4 py-2 transition-colors", lastScanned === variant.id && "bg-accent/50")}>
                        <ColorDot color={variant.attributes.color} />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {variant.attributes.color} · {sizeLabel(variant.attributes.size)}
                        </span>
                        {reviewing ? (
                          <span className="flex items-center gap-4 text-sm tabular-nums">
                            <span className="text-muted-foreground">System {expected}</span>
                            <span>Counted {counted}</span>
                            <span className={cn("w-10 text-right font-semibold", diff > 0 ? "text-success" : "text-destructive")}>{diff > 0 ? `+${diff}` : diff}</span>
                          </span>
                        ) : (
                          <Stepper value={counted} onChange={(value) => handleSetCount(variant.id, value)} />
                        )}
                      </li>
                    )
                  })}
                {reviewing && sizes.every(({ counted, expected }) => counted === expected) && <li className="px-4 py-3 text-sm text-muted-foreground">Every size matches.</li>}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">Saving books each difference as a stock fix with the reason “Stock count”, under your name.</p>
    </>
  )
}
