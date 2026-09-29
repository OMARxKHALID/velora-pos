"use client"

import { cn } from "cn"
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"

export const Segmented = ({ options, value, onChange, className, label }) => (
  <ToggleGroup
    data-slot="segmented"
    aria-label={label}
    spacing={0}
    value={[value]}
    onValueChange={([next]) => next && onChange(next)}
    className={cn("max-w-full flex-wrap border", className)}
  >
    {options.map(({ key, label: text }) => (
      <ToggleGroupItem
        key={key}
        value={key}
        className="h-9 grow px-3 font-medium tracking-normal normal-case text-muted-foreground hover:bg-transparent aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground pointer-coarse:h-11 pointer-coarse:px-4"
      >
        {text}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
)
