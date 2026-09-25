"use client"

import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { PlusIcon, XIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Autocomplete, AutocompleteContent, AutocompleteEmpty, AutocompleteInput, AutocompleteItem, AutocompleteList } from "@/components/ui/autocomplete"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { formatMoney, toPaisa } from "@/lib/money"
import { useCatalog } from "../hooks/use-catalog"
import { ONE_SIZE, SIZE_TYPES, categoryFor, compareSizes, pctCodeFor, sizePresets, variantKey } from "../lib/catalog"
import { mostUsedColors, suggestColors, swatchStyle } from "../lib/colors"
import { CategoryEditorDialog } from "./category-editor-dialog"
import { IconForKey } from "./category-icon"
import { ColorDot } from "./color-dot"
import { OpeningStockGrid, stockKey, toPairs } from "./opening-stock-grid"
import { productSchema } from "../schemas"
import { useSettingsFor } from "@/features/shops/hooks/use-shop-scope"

const presetSizes = (sizeType, audience) => (sizeType === "shoe" ? sizePresets[audience].map(String) : sizeType === "one" ? [ONE_SIZE] : ["S", "M", "L", "XL"])
const audiences = ["men", "women", "kids", "unisex"].map((key) => ({ key, label: key[0].toUpperCase() + key.slice(1) }))

const MoneyInput = ({ field, fieldState, label }) => (
  <Field data-invalid={fieldState.invalid}>
    <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>Rs</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput {...field} id={field.name} inputMode="decimal" className="tabular-nums" aria-invalid={fieldState.invalid} />
    </InputGroup>
    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
  </Field>
)

const PercentInput = ({ field, fieldState, label }) => (
  <Field data-invalid={fieldState.invalid}>
    <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
    <InputGroup>
      <InputGroupInput {...field} id={field.name} inputMode="decimal" className="tabular-nums" aria-invalid={fieldState.invalid} />
      <InputGroupAddon align="inline-end">
        <InputGroupText>%</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
  </Field>
)

const ColorChip = ({ color, suffix, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-7 items-center gap-1.5 border border-transparent px-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground pointer-coarse:h-10 pointer-coarse:px-3"
  >
    <ColorDot color={color} className="size-3.5" />
    {color}
    {suffix && <span className="text-2xs tabular-nums">{suffix}</span>}
  </button>
)

const ColorPicker = ({ value, onChange, popular }) => {
  const [draft, setDraft] = useState("")
  const suggestions = suggestColors(draft, value)
  const typedKnown = draft.trim() && swatchStyle(draft)

  const handleAdd = (color) => {
    const name = color.trim().replace(/\s+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    if (name && !value.includes(name)) onChange([...value, name])
    setDraft("")
  }

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    if (draft.trim()) handleAdd(draft)
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((color) => (
            <span key={color} className="flex h-8 items-center gap-2 border border-primary/60 bg-accent/60 pr-1 pl-2.5 text-xs pointer-coarse:h-11">
              <ColorDot color={color} />
              {color}
              <button
                type="button"
                aria-label={`Remove ${color}`}
                onClick={() => onChange(value.filter((item) => item !== color))}
                className="flex items-center justify-center p-1 text-muted-foreground hover:text-foreground pointer-coarse:size-10"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <InputGroup>
        <InputGroupAddon>
          <ColorDot color={draft} className="size-4" />
        </InputGroupAddon>
        <InputGroupInput value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="Type a colour, e.g. Burgundy" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="xs" variant="ghost" disabled={!draft.trim()} onClick={() => handleAdd(draft)}>
            Add
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {draft.trim() && !typedKnown && <p className="text-xs text-muted-foreground">No swatch for “{draft.trim()}”. It will be saved as typed.</p>}

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((color) => (
            <ColorChip key={color} color={color} onClick={() => handleAdd(color)} />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">Most used</p>
          <div className="flex flex-wrap gap-1">
            {popular
              .filter(({ color }) => !value.includes(color))
              .map(({ color, count }) => (
                <ColorChip key={color} color={color} suffix={`×${count}`} onClick={() => handleAdd(color)} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const ProductFormDialog = ({ product, user, onClose }) => {
  const shopId = useShopScope(user)
  const saveProduct = useDemoStore(({ saveProduct }) => saveProduct)
  const receivePurchase = useDemoStore(({ receivePurchase }) => receivePurchase)
  const settings = useSettingsFor(shopId)
  const [quantities, setQuantities] = useState({})
  const { products } = useCatalog()
  const categories = useDemoStore(({ categories }) => categories)
  const [addingCategory, setAddingCategory] = useState(false)
  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? { ...product, pctCode: product.pctCode ?? "", discountPct: product.discountPct ?? 0, price: String(product.price / 100), cost: String(product.cost / 100) }
      : { name: "", brand: "Velora", category: categories[0]?.name ?? "Sneakers", audience: "men", price: "", cost: "", pctCode: "", discountPct: 0, colors: [], sizes: presetSizes(categories[0]?.sizeType ?? "shoe", "men") },
  })
  const [audience, colors, sizes, price, cost, category] = useWatch({ control: form.control, name: ["audience", "colors", "sizes", "price", "cost", "category"] })
  const margin = Number(price) > 0 ? Math.round(((Number(price) - Number(cost || 0)) / Number(price)) * 100) : null
  const brands = [...new Set(products.map(({ brand }) => brand))].toSorted()
  const sizeType = categoryFor(categories, category)?.sizeType ?? "shoe"
  const unit = sizeType === "shoe" ? "pairs" : "pieces"

  const handleCategory = (name) => {
    const nextType = categoryFor(categories, name)?.sizeType ?? "shoe"
    form.setValue("category", name, { shouldValidate: true })
    if (!product || nextType !== sizeType) form.setValue("sizes", presetSizes(nextType, audience))
  }

  const handleSubmit = form.handleSubmit((values) => {
    try {
      const saved = saveProduct({
        productId: product?.id ?? null,
        input: { ...values, shopId, price: toPaisa(values.price), cost: toPaisa(values.cost), sizes: values.sizes.toSorted(compareSizes) },
      })
      const lines = product
        ? []
        : values.colors.flatMap((color) =>
            values.sizes
              .map((size) => ({ variantId: variantKey(saved.id, color, size), quantity: toPairs(quantities[stockKey(color, size)]), unitCost: saved.cost }))
              .filter(({ quantity }) => quantity > 0)
          )
      if (lines.length) receivePurchase({ supplier: "Opening stock", receivedBy: user.id, lines })
      const pairs = lines.reduce((sum, { quantity }) => sum + quantity, 0)
      toast.success(product ? "Product updated" : "Product added", {
        description: product ? `${saved.name} · ${formatMoney(saved.price)}` : `${saved.name} · ${pairs} ${unit} in stock, ready to sell at ${formatMoney(saved.price)}`,
      })
      onClose()
    } catch (error) {
      toast.error(error.message)
    }
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{product ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>Each colour and size becomes a sellable item with its own SKU and barcode.</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input {...field} id={field.name} autoFocus placeholder="Velora Crest Sneaker" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="brand"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Brand</FieldLabel>
                    <Autocomplete items={brands} value={field.value} onValueChange={field.onChange}>
                      <AutocompleteInput id={field.name} onBlur={field.onBlur} placeholder="Pick or type a brand" autoComplete="off" aria-invalid={fieldState.invalid} />
                      <AutocompleteContent>
                        <AutocompleteEmpty>New brand. It is added when you save.</AutocompleteEmpty>
                        <AutocompleteList>
                          {(brand) => (
                            <AutocompleteItem key={brand} value={brand}>
                              {brand}
                            </AutocompleteItem>
                          )}
                        </AutocompleteList>
                      </AutocompleteContent>
                    </Autocomplete>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="category"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                      <Button type="button" variant="link" size="xs" className="h-auto px-0 pointer-coarse:h-auto" onClick={() => setAddingCategory(true)}>
                        <PlusIcon />
                        New
                      </Button>
                    </div>
                    <Select value={field.value} onValueChange={handleCategory}>
                      <SelectTrigger id={field.name} className="w-full" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Pick a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((option) => (
                          <SelectItem key={option.id} value={option.name}>
                            <IconForKey icon={option.icon} className="size-4 text-gold" weight="regular" />
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller name="price" control={form.control} render={({ field, fieldState }) => <MoneyInput field={field} fieldState={fieldState} label="Selling price" />} />
              <Controller name="cost" control={form.control} render={({ field, fieldState }) => <MoneyInput field={field} fieldState={fieldState} label="Cost price" />} />
            </div>
            <Controller
              name="pctCode"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>PCT code</FieldLabel>
                  <Input {...field} id={field.name} inputMode="decimal" placeholder={pctCodeFor(categories, category)} className="max-w-48 font-mono" aria-invalid={fieldState.invalid} />
                  <FieldDescription>Tariff heading reported to FBR with every sale. Leave empty to use {pctCodeFor(categories, category)} for {category || "this category"}.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            {settings.productDiscountEnabled && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                  name="discountPct"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <PercentInput
                      field={field}
                      fieldState={fieldState}
                      label="Offer discount"
                    />
                  )}
                />
                <FieldDescription className="pt-8">Automatic percent off at the counter for this product. 0 for no offer.</FieldDescription>
              </div>
            )}
            {margin !== null && <FieldDescription className="-mt-2">Margin {margin}% · saved on every sale for profit reports.</FieldDescription>}

            <Controller
              name="audience"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>For</FieldLabel>
                  <Segmented
                    options={audiences}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value)
                      if (!product && sizeType === "shoe") form.setValue("sizes", presetSizes(sizeType, value))
                    }}
                  />
                </Field>
              )}
            />

            <Controller
              name="colors"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Colours</FieldLabel>
                  <ColorPicker value={field.value} onChange={field.onChange} popular={mostUsedColors(products)} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="sizes"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between">
                    <FieldLabel>{sizeType === "shoe" ? "Sizes (EU)" : "Sizes"}</FieldLabel>
                    {sizeType === "shoe" && (
                      <Button type="button" variant="link" size="xs" className="px-0" onClick={() => field.onChange(presetSizes(sizeType, audience))}>
                        Use {audience} sizes
                      </Button>
                    )}
                  </div>
                  {sizeType === "one" ? (
                    <p className="border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{ONE_SIZE}. Each colour is one item.</p>
                  ) : (
                  <div className={cn("grid gap-1", sizeType === "shoe" ? "grid-cols-10" : "grid-cols-6")}>
                    {SIZE_TYPES[sizeType].sizes.map((size) => {
                      const on = field.value.includes(size)
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => field.onChange(on ? field.value.filter((item) => item !== size) : [...field.value, size])}
                          className={cn("h-8 border text-xs tabular-nums transition-colors pointer-coarse:h-11", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary/60")}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                  )}
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          {product ? (
            <p className="text-xs text-muted-foreground">To change how many {unit} you have, use Receive delivery or fix stock on the Stock page.</p>
          ) : (
            <Field>
              <FieldLabel>{unit === "pairs" ? "Pairs" : "Pieces"} in stock now</FieldLabel>
              <OpeningStockGrid colors={colors} sizes={sizes.toSorted(compareSizes)} value={quantities} onChange={setQuantities} unit={unit} />
            </Field>
          )}

          <p className="border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            {colors.length} {colors.length === 1 ? "colour" : "colours"} × {sizes.length} sizes = <span className="font-semibold text-foreground">{colors.length * sizes.length} items</span>
            {product && ". Sizes you remove that have history are archived, not deleted."}
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{product ? "Save changes" : "Add product"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {addingCategory && <CategoryEditorDialog onClose={() => setAddingCategory(false)} onSaved={(saved) => {
            form.setValue("category", saved.name, { shouldValidate: true })
            form.setValue("sizes", presetSizes(saved.sizeType, audience))
          }} />}
    </Dialog>
  )
}
