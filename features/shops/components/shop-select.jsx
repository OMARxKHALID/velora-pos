"use client"

import { StorefrontIcon } from "@phosphor-icons/react"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"

export const ShopSelect = ({ value, onChange, id = "shop", label = "Shop" }) => {
  const shops = useDemoStore(({ shops }) => shops)
  const open = shops.filter(({ active }) => active !== false)
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange} items={open.map(({ id: key, name }) => ({ value: key, label: name }))}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Pick a shop" />
        </SelectTrigger>
        <SelectContent>
          {open.map((shop) => (
            <SelectItem key={shop.id} value={shop.id}>
              <StorefrontIcon className="size-4 text-gold" />
              {shop.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
