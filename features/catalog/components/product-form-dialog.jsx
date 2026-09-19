"use client"

import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { XIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { formatMoney, toPaisa } from "@/lib/money"
import { useCatalog } from "../hooks/use-catalog"
import { colorSwatches, sizePresets } from "../lib/catalog"
import { productSchema } from "../schemas"

const allSizes = Array.from({ length: 20 }, (_, index) => String(28 + index))
const audiences = ["men", "women", "kids", "unisex"].map((key) => ({ key, label: key }))

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

const ColorPicker = ({ value, onChange }) => {
  const [draft, setDraft] = useState("")

  const handleAdd = (color) => {
    const name = color.trim().replace(/\b\w/g, (letter) => letter.toUpperCase())
    if (name && !value.includes(name)) onChange([...value, name])
    setDraft("")
  }

  const handleKeyDown = (event) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    handleAdd(draft)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((color) => (
          <span key={color} className="flex h-8 items-center gap-2 border border-primary/60 bg-accent/60 pr-1 pl-2.5 text-xs">
            <span className="size-3 rounded-full border border-foreground/20" style={{ backgroundColor: colorSwatches[color] ?? "transparent" }} />
            {color}
            <button type="button" aria-label={`Remove ${color}`} onClick={() => onChange(value.filter((item) => item !== color))} className="p-1 text-muted-foreground hover:text-foreground">
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} onBlur={() => draft && handleAdd(draft)} placeholder="Type a colour, Enter" className="h-8 w-40 text-xs" />
      </div>
      <div className="flex flex-wrap gap-1">
        {Object.keys(colorSwatches)
          .filter((color) => !color.includes("/") && !value.includes(color))
          .map((color) => (
            <button key={color} type="button" onClick={() => handleAdd(color)} className="flex h-6 items-center gap-1.5 px-1.5 text-[0.65rem] text-muted-foreground hover:text-foreground">
              <span className="size-2.5 rounded-full border border-foreground/20" style={{ backgroundColor: colorSwatches[color] }} />
              {color}
            </button>
          ))}
      </div>
    </div>
  )
}

export const ProductFormDialog = ({ product, onClose }) => {
  const saveProduct = useDemoStore(({ saveProduct }) => saveProduct)
  const { products } = useCatalog()
  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? { ...product, price: String(product.price / 100), cost: String(product.cost / 100) }
      : { name: "", brand: "Velora", category: "Sneakers", audience: "men", price: "", cost: "", colors: [], sizes: sizePresets.men.map(String) },
  })
  const [audience, colors, sizes, price, cost] = useWatch({ control: form.control, name: ["audience", "colors", "sizes", "price", "cost"] })
  const margin = Number(price) > 0 ? Math.round(((Number(price) - Number(cost || 0)) / Number(price)) * 100) : null
  const brands = [...new Set(products.map(({ brand }) => brand))]
  const categories = [...new Set(products.map(({ category }) => category))]

  const handleSubmit = form.handleSubmit((values) => {
    try {
      const saved = saveProduct({
        productId: product?.id ?? null,
        input: { ...values, price: toPaisa(values.price), cost: toPaisa(values.cost), sizes: values.sizes.toSorted((a, b) => Number(a) - Number(b)) },
      })
      toast.success(product ? "Product updated" : "Product added", {
        description: `${saved.name} · ${values.colors.length * values.sizes.length} sizes ready to sell at ${formatMoney(saved.price)}`,
      })
      onClose()
    } catch (error) {
      toast.error(error.message)
    }
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
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
              {[
                ["brand", "Brand", brands],
                ["category", "Category", categories],
              ].map(([name, label, options]) => (
                <Controller
                  key={name}
                  name={name}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
                      <Input {...field} id={field.name} list={`${name}-options`} aria-invalid={fieldState.invalid} />
                      <datalist id={`${name}-options`}>
                        {options.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller name="price" control={form.control} render={({ field, fieldState }) => <MoneyInput field={field} fieldState={fieldState} label="Selling price" />} />
              <Controller name="cost" control={form.control} render={({ field, fieldState }) => <MoneyInput field={field} fieldState={fieldState} label="Cost price" />} />
            </div>
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
                      if (!product) form.setValue("sizes", sizePresets[value].map(String))
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
                  <ColorPicker value={field.value} onChange={field.onChange} />
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
                    <FieldLabel>Sizes (EU)</FieldLabel>
                    <Button type="button" variant="link" size="xs" className="px-0" onClick={() => field.onChange(sizePresets[audience].map(String))}>
                      Use {audience} sizes
                    </Button>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {allSizes.map((size) => {
                      const on = field.value.includes(size)
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => field.onChange(on ? field.value.filter((item) => item !== size) : [...field.value, size])}
                          className={cn("h-8 border text-xs tabular-nums transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary/60")}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

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
    </Dialog>
  )
}
