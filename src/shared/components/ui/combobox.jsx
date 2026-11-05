"use client"

import { useRef } from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, XIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/shared/components/ui/button"

export const Combobox = ComboboxPrimitive.Root

export const ComboboxValue = (props) => <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />

export const ComboboxContent = ({ className, side = "bottom", sideOffset = 6, align = "start", alignOffset = 0, anchor, ...props }) => (
  <ComboboxPrimitive.Portal>
    <ComboboxPrimitive.Positioner side={side} sideOffset={sideOffset} align={align} alignOffset={alignOffset} anchor={anchor} className="isolate z-50">
      <ComboboxPrimitive.Popup
        data-slot="combobox-content"
        data-chips={!!anchor}
        className={cn(
          "group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-(--anchor-width) origin-(--transform-origin) overflow-hidden rounded-none bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 ease-snappy data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      />
    </ComboboxPrimitive.Positioner>
  </ComboboxPrimitive.Portal>
)

export const ComboboxList = ({ className, ...props }) => (
  <ComboboxPrimitive.List
    data-slot="combobox-list"
    className={cn("max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1.5 overflow-y-auto overscroll-contain p-1.5 data-empty:p-0", className)}
    {...props}
  />
)

export const ComboboxItem = ({ className, children, ...props }) => (
  <ComboboxPrimitive.Item
    data-slot="combobox-item"
    className={cn(
      "relative flex w-full cursor-default items-center gap-2.5 rounded-none py-2 pr-8 pl-3 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 pointer-coarse:py-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
      className
    )}
    {...props}
  >
    {children}
    <ComboboxPrimitive.ItemIndicator render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}>
      <CheckIcon className="pointer-events-none" />
    </ComboboxPrimitive.ItemIndicator>
  </ComboboxPrimitive.Item>
)

export const ComboboxEmpty = ({ className, ...props }) => (
  <ComboboxPrimitive.Empty data-slot="combobox-empty" className={cn("hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex", className)} {...props} />
)

export const ComboboxChips = ({ className, ...props }) => (
  <ComboboxPrimitive.Chips
    data-slot="combobox-chips"
    className={cn(
      "flex min-h-10 flex-wrap items-center gap-1.5 rounded-none border border-transparent border-b-input bg-transparent bg-clip-padding px-0 py-1.5 text-sm transition-[color,border-color] focus-within:border-b-ring has-aria-invalid:border-b-destructive pointer-coarse:min-h-11 dark:has-aria-invalid:border-b-destructive/50",
      className
    )}
    {...props}
  />
)

export const ComboboxChip = ({ className, children, showRemove = true, removeLabel = "Remove", ...props }) => (
  <ComboboxPrimitive.Chip
    data-slot="combobox-chip"
    className={cn(
      "flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 rounded-none bg-muted px-2 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0",
      className
    )}
    {...props}
  >
    {children}
    {showRemove && (
      <ComboboxPrimitive.ChipRemove render={<Button variant="ghost" size="icon-xs" />} aria-label={removeLabel} className="-ml-1 opacity-50 hover:opacity-100" data-slot="combobox-chip-remove">
        <XIcon className="pointer-events-none" />
      </ComboboxPrimitive.ChipRemove>
    )}
  </ComboboxPrimitive.Chip>
)

export const ComboboxChipsInput = ({ className, ...props }) => (
  <ComboboxPrimitive.Input data-slot="combobox-chip-input" className={cn("min-w-16 flex-1 bg-transparent outline-none placeholder:text-muted-foreground pointer-coarse:text-base", className)} {...props} />
)

export const useComboboxAnchor = () => useRef(null)
