"use client"

import { useDeferredValue, useState } from "react"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { CategoryIcon } from "@/features/catalog/components/category-icon"
import { compareSizes, lowLimitFor, sizeLabel, sizeRangeLabel } from "@/features/catalog/lib/catalog"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { formatMoney, sumBy } from "@/lib/money"
import { useSettingsFor } from "@/features/shops/hooks/use-shop-scope"

const audiences = ["All", "men", "women", "kids", "unisex"]

const audienceLabels = { All: "Everyone", men: "Men", women: "Women", kids: "Kids", unisex: "Unisex" }

const LOW_MODEL_FACTOR = 2

const columnSteps = ["grid-cols-2", "@sm:grid-cols-3", "@xl:grid-cols-4", "@3xl:grid-cols-5", "@5xl:grid-cols-6", "@6xl:grid-cols-7", "@7xl:grid-cols-8"]

const Chip = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "h-7 shrink-0 border px-2.5 pointer-coarse:h-10 pointer-coarse:px-3.5 text-xs font-medium transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"
    )}
  >
    {children}
  </button>
)

const sizesLeft = (variants, availableFor) => {
  const left = new Map()
  for (const { id, attributes } of variants) left.set(attributes.size, (left.get(attributes.size) ?? 0) + Math.max(availableFor(id), 0))
  return [...left].map(([size, count]) => ({ size, count })).toSorted((a, b) => compareSizes(a.size, b.size))
}

const ProductCard = ({ product, sizes, lowLimit, onPick }) => {
  const available = sumBy(sizes, ({ count }) => count)
  const low = available > 0 && available <= lowLimit
  const inStock = sizes.filter(({ count }) => count > 0).map(({ size }) => size)
  const missing = sizes.filter(({ count }) => count <= 0).map(({ size }) => size)

  return (
    <button
      type="button"
      onClick={() => onPick(product)}
      disabled={!available}
      className="flex flex-col border bg-card text-left transition-colors hover:border-primary/70 disabled:pointer-events-none disabled:opacity-40"
    >
      <div className="relative flex h-12 items-center justify-center bg-muted">
        <CategoryIcon category={product.category} className="size-8 text-gold" />
        {!available && (
          <span className="absolute top-1.5 right-1.5 bg-destructive px-1 text-2xs font-semibold tracking-widest text-destructive-foreground uppercase">Out</span>
        )}
        {low && (
          <span className="absolute top-1.5 right-1.5 bg-warning px-1 text-2xs font-semibold tracking-widest text-warning-foreground uppercase">Low</span>
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

export const CatalogPanel = ({ shopId, availableFor, onPick, onScan }) => {
  const { products: allProducts, variantsByProduct } = useCatalog()
  const { lowStockThreshold: lowLimit, posColumns = 6 } = useSettingsFor(shopId)
  const categories = useDemoStore(({ categories }) => categories)
  const products = allProducts.filter((product) => product.status === "active" && product.shopId === shopId)
  const brands = ["All", ...new Set(products.map(({ brand }) => brand))]
  const [query, setQuery] = useState("")
  const [brand, setBrand] = useState("All")
  const [audience, setAudience] = useState("All")
  const search = useDeferredValue(query.trim().toLowerCase())

  const handleSearchKeyDown = (event) => {
    const code = query.trim()
    if (event.key !== "Enter" || !/^\d{6,}$/.test(code)) return
    event.preventDefault()
    onScan(code)
    setQuery("")
  }

  const visible = products.filter(
    (product) =>
      (brand === "All" || product.brand === brand) &&
      (audience === "All" || product.audience === audience) &&
      (!search || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(search))
  )

  return (
    <section className="@container flex min-h-0 min-w-0 flex-1 flex-col gap-2.5">
      <InputGroup className="h-10">
        <InputGroupAddon>
          <MagnifyingGlassIcon />
        </InputGroupAddon>
        <InputGroupInput value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Search products, brands, categories…" />
      </InputGroup>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {brands.map((name) => (
          <Chip key={name} active={brand === name} onClick={() => setBrand(name)}>
            {name}
          </Chip>
        ))}
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {audiences.map((name) => (
          <Chip key={name} active={audience === name} onClick={() => setAudience(name)}>
            {audienceLabels[name]}
          </Chip>
        ))}
      </div>
      <div className={cn("grid min-h-0 flex-1 auto-rows-max gap-2 overflow-y-auto pr-1", columnSteps.slice(0, posColumns - 1).join(" "))}>
        {visible.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            lowLimit={lowLimitFor(categories, product.category, lowLimit) * LOW_MODEL_FACTOR}
            sizes={sizesLeft(variantsByProduct[product.id].filter(({ active }) => active), availableFor)}
            onPick={onPick}
          />
        ))}
        {!visible.length && <p className="col-span-full py-12 text-center text-sm text-muted-foreground">No products match these filters.</p>}
      </div>
    </section>
  )
}
