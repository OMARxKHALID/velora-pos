"use client"

import { useDeferredValue, useState } from "react"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ColorDot } from "@/features/catalog/components/color-dot"
import { useCatalog } from "@/features/catalog/hooks/use-catalog"
import { CategoryIcon } from "@/features/catalog/components/category-icon"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { formatMoney, sumBy } from "@/lib/money"

const audiences = ["All", "men", "women", "kids", "unisex"]

const LOW_MODEL_FACTOR = 2

const Chip = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "h-7 shrink-0 border px-2.5 pointer-coarse:h-10 pointer-coarse:px-3.5 text-2xs font-semibold tracking-widest uppercase transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"
    )}
  >
    {children}
  </button>
)

const ProductCard = ({ product, available, lowLimit, onPick }) => {
  const low = available > 0 && available <= lowLimit

  return (
    <button
      type="button"
      onClick={() => onPick(product)}
      disabled={!available}
      className="flex flex-col border bg-card text-left transition-colors hover:border-primary/70 disabled:pointer-events-none disabled:opacity-40"
    >
      <div className="relative flex h-16 items-center justify-center bg-muted">
        <CategoryIcon category={product.category} className="size-9 text-gold" />
        {!available && (
          <span className="absolute top-1.5 right-1.5 bg-destructive px-1 text-2xs font-semibold tracking-widest text-destructive-foreground uppercase">Out</span>
        )}
        {low && (
          <span className="absolute top-1.5 right-1.5 bg-warning px-1 text-2xs font-semibold tracking-widest text-warning-foreground uppercase">Low</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <span className="truncate text-2xs font-semibold tracking-label text-muted-foreground uppercase">{product.brand}</span>
        <span className="line-clamp-2 text-xs leading-snug font-medium">{product.name}</span>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-sm font-semibold text-gold tabular-nums">{formatMoney(product.price)}</span>
          <span className="flex gap-0.5">
            {product.colors.map((color) => (
              <ColorDot key={color} color={color} className="size-3.5" />
            ))}
          </span>
        </div>
        <span className="text-2xs text-muted-foreground tabular-nums">{available} in stock</span>
      </div>
    </button>
  )
}

export const CatalogPanel = ({ availableFor, onPick }) => {
  const { products: allProducts, variantsByProduct } = useCatalog()
  const lowLimit = useDemoStore(({ settings }) => settings.lowStockThreshold) * LOW_MODEL_FACTOR
  const products = allProducts.filter(({ status }) => status === "active")
  const brands = ["All", ...new Set(products.map(({ brand }) => brand))]
  const [query, setQuery] = useState("")
  const [brand, setBrand] = useState("All")
  const [audience, setAudience] = useState("All")
  const search = useDeferredValue(query.trim().toLowerCase())

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
        <InputGroupInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shoes, brands, categories…" />
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
            {name === "All" ? "Everyone" : name}
          </Chip>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-2 @sm:grid-cols-3 @lg:grid-cols-4 @2xl:grid-cols-5 @3xl:grid-cols-6 gap-2 overflow-y-auto pr-1">
        {visible.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            lowLimit={lowLimit}
            available={sumBy(variantsByProduct[product.id].filter(({ active }) => active), ({ id }) => Math.max(availableFor(id), 0))}
            onPick={onPick}
          />
        ))}
        {!visible.length && <p className="col-span-full py-12 text-center text-sm text-muted-foreground">No shoes match these filters.</p>}
      </div>
    </section>
  )
}
