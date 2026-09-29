"use client"

import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"
import { ColorDot } from "./color-dot"

export const ColorChoice = ({ colors, value, onChange }) => (
  <ToggleGroup aria-label="Colour" variant="chip" size="chip" value={[value]} onValueChange={([next]) => next && onChange(next)} className="flex-wrap">
    {colors.map((name) => (
      <ToggleGroupItem key={name} value={name} className="gap-2">
        <ColorDot color={name} className="size-3.5" />
        {name}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
)
