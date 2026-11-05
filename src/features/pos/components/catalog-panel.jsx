"use client"

import { memo, useCallback, useDeferredValue, useLayoutEffect, useMemo, useRef, useState } from "react"
import { isBarcodeLike } from "../lib/barcode-input"
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/shared/components/ui/input-group"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { CategoryIcon } from "@/features/catalog/components/category-icon"
import { compareSizes, lowLimitFor, sizeLabel, sizeRangeLabel } from "@/features/catalog/lib/catalog"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { formatMoney, sumBy } from "@/shared/lib/money"
import { useSettingsFor } from "@/features/shops/hooks/use-shop-scope"
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"
import { Empty, EmptyDescription } from "@/shared/components/ui/empty"
import { Badge } from "@/shared/components/ui/badge"

const audiences = ["All", "men", "women", "kids", "unisex"]

const audienceLabels = { All: "Everyone", men: "Men", women: "Women", kids: "Kids", unisex: "Unisex" }

const LOW_MODEL_FACTOR = 2

const columnSteps = ["grid-cols-2", "@sm:grid-cols-3", "@xl:grid-cols-4", "@3xl:grid-cols-5", "@5xl:grid-cols-6", "@6xl:grid-cols-7", "@7xl:grid-cols-8"]

const FilterChips = ({ label, options, value, onChange }) => (
  <ToggleGroup
    aria-label={label}
    variant="solid"
    spacing={2}
    value={[value]}
    onValueChange={([next]) => next && onChange(next)}
    className="-mx-1 w-auto flex-nowrap self-stretch overflow-x-auto px-1 [scrollbar-width:none] max-lg:pr-8 max-lg:mask-r-from-90% lg:pointer-fine:flex-wrap lg:pointer-fine:overflow-visible [&::-webkit-scrollbar]:hidden"
  >
    {options.map(([key, text]) => (
      <ToggleGroupItem key={key} value={key} className="h-7 px-2.5 font-medium text-muted-foreground hover:text-foreground pointer-coarse:h-11 pointer-coarse:px-4">
        {text}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
)

const sizesLeft = (variants, availableFor) => {
  const left = new Map()
  for (const { id, attributes } of variants) left.set(attributes.size, (left.get(attributes.size) ?? 0) + Math.max(availableFor(id), 0))
  return [...left].map(([size, count]) => ({ size, count })).toSorted((a, b) => compareSizes(a.size, b.size))
}

const sizesKey = (sizes) => sizes.map(({ size, count }) => `${size}:${count}`).join("|")

const sameCard = (before, after) => before.product === after.product && before.lowLimit === after.lowLimit && before.onPick === after.onPick && sizesKey(before.sizes) === sizesKey(after.sizes)

const ProductCardView = ({ product, sizes, lowLimit, onPick }) => {
  const available = sumBy(sizes, ({ count }) => count)
  const low = available > 0 && available <= lowLimit
  const inStock = sizes.filter(({ count }) => count > 0).map(({ size }) => size)
  const missing = sizes.filter(({ count }) => count <= 0).map(({ size }) => size)

  return (
    <button
      type="button"
      onClick={() => onPick(product)}
      disabled={!available}
      className="flex flex-col border bg-card text-left transition-[scale,border-color,background-color] duration-100 ease-snappy hover:border-primary/70 active:scale-[0.98] active:border-primary active:bg-accent/40 disabled:pointer-events-none disabled:opacity-40"
    >
      <div className="relative flex h-12 items-center justify-center bg-muted">
        <CategoryIcon category={product.category} className="size-8 text-gold" />
        {!available && (
          <Badge variant="destructive" className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground">Out</Badge>
        )}
        {low && (
          <Badge variant="warning" className="absolute top-1.5 right-1.5 bg-warning text-warning-foreground">Low</Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <span className="truncate text-2xs font-semibold tracking-label text-muted-foreground uppercase">{product.brand}</span>
        <span className="line-clamp-2 text-sm leading-snug font-medium">{product.name}</span>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-base font-semibold text-gold tabular-nums">{formatMoney(product.price)}</span>
          <span className="flex gap-0.5">
            {product.colors.map((color) => (
              <ColorDot key={color} color={color} className="size-3.5" />
            ))}
          </span>
        </div>
        <span className="truncate text-xs text-muted-foreground tabular-nums" title={inStock.length ? `${inStock.map(sizeLabel).join(", ")} in stock` : "No sizes left"}>
          {sizeRangeLabel(sizes.map(({ size }) => size))}
          {missing.length > 0 && inStock.length > 0 && <span className="text-destructive"> · {missing.length > 2 ? `${missing.length} out` : `no ${missing.join(", ")}`}</span>}
        </span>
      </div>
    </button>
  )
}

const ProductCard = memo(ProductCardView, sameCard)

export const CatalogPanel = ({ shopId, availableFor, onPick, onScan }) => {
  const { products: allProducts, variantsByProduct } = useCatalog()
  const { lowStockThreshold, posColumns = 6 } = useSettingsFor(shopId)
  const lowLimit = lowStockThreshold * LOW_MODEL_FACTOR
  const categories = useLedgerStore(({ categories }) => categories)
  const products = useMemo(() => allProducts.filter((product) => product.status === "active" && product.shopId === shopId), [allProducts, shopId])
  const brands = useMemo(() => ["All", ...new Set(products.map(({ brand }) => brand))], [products])
  const [query, setQuery] = useState("")
  const [brand, setBrand] = useState("All")
  const [audience, setAudience] = useState("All")
  const search = useDeferredValue(query.trim().toLowerCase())
  const pickRef = useRef(onPick)

  useLayoutEffect(() => {
    pickRef.current = onPick
  })

  const handlePickProduct = useCallback((product) => pickRef.current(product), [])

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape" && query) {
      event.preventDefault()
      setQuery("")
      return
    }
    const code = query.trim()
    if (event.key !== "Enter" || !isBarcodeLike(code)) return
    event.preventDefault()
    onScan(code)
    setQuery("")
  }

  const visible = useMemo(
    () =>
      products.filter(
        (product) =>
          (brand === "All" || product.brand === brand) &&
          (audience === "All" || product.audience === audience) &&
          (!search || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(search))
      ),
    [products, brand, audience, search]
  )

  return (
    <section className="@container flex min-h-0 min-w-0 flex-1 flex-col gap-2.5">
      <InputGroup className="h-10">
        <InputGroupAddon>
          <MagnifyingGlassIcon />
        </InputGroupAddon>
        <InputGroupInput type="search" enterKeyHint="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKeyDown} aria-label="Search products" placeholder="Search products, brands, categories…" />
        {query && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-sm" aria-label="Clear search" onClick={() => setQuery("")}>
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      <FilterChips label="Brand" options={brands.map((name) => [name, name])} value={brand} onChange={setBrand} />
      <FilterChips label="For" options={audiences.map((name) => [name, audienceLabels[name]])} value={audience} onChange={setAudience} />
      <div className={cn("grid min-h-0 flex-1 auto-rows-max gap-2 overflow-y-auto pr-1", columnSteps.slice(0, posColumns - 1).join(" "))}>
        {visible.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            lowLimit={lowLimitFor(categories, product.category, lowLimit) * LOW_MODEL_FACTOR}
            sizes={sizesLeft(variantsByProduct[product.id].filter(({ active }) => active), availableFor)}
            onPick={handlePickProduct}
          />
        ))}
        {!visible.length && <Empty className="col-span-full"><EmptyDescription>No products match these filters.</EmptyDescription></Empty>}
      </div>
    </section>
  )
}
