"use client"

import * as React from "react"
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete"
import { cn } from "cn"

function Autocomplete({ ...props }) {
  return <AutocompletePrimitive.Root data-slot="autocomplete" openOnInputClick {...props} />
}

function AutocompleteInput({ className, ...props }) {
  return (
    <AutocompletePrimitive.Input
      data-slot="autocomplete-input"
      className={cn(
        "h-10 w-full min-w-0 rounded-none border border-transparent border-b-input bg-transparent px-0 py-1 text-base transition-[color,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-b-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-b-destructive md:text-sm pointer-coarse:h-11 pointer-coarse:text-base dark:aria-invalid:border-b-destructive/50",
        className
      )}
      {...props}
    />
  )
}

function AutocompleteContent({ className, children, side = "bottom", sideOffset = 4, align = "start", ...props }) {
  return (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner side={side} sideOffset={sideOffset} align={align} className="isolate z-50 outline-none">
        <AutocompletePrimitive.Popup
          data-slot="autocomplete-content"
          className={cn(
            "z-50 max-h-[min(var(--available-height),18rem)] w-(--anchor-width) min-w-48 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-none bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </AutocompletePrimitive.Popup>
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  )
}

function AutocompleteList({ className, ...props }) {
  return <AutocompletePrimitive.List data-slot="autocomplete-list" className={cn("outline-none empty:hidden", className)} {...props} />
}

function AutocompleteItem({ className, ...props }) {
  return (
    <AutocompletePrimitive.Item
      data-slot="autocomplete-item"
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-2.5 rounded-none px-3 py-2 text-sm outline-hidden select-none pointer-coarse:py-3 data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function AutocompleteEmpty({ className, ...props }) {
  return <AutocompletePrimitive.Empty data-slot="autocomplete-empty" className={cn("px-3 py-2 text-xs text-muted-foreground empty:hidden", className)} {...props} />
}

export { Autocomplete, AutocompleteContent, AutocompleteEmpty, AutocompleteInput, AutocompleteItem, AutocompleteList }
