"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ColorDot } from "./color-dot"

export const stockKey = (color, size) => `${color}|${size}`

export const toPairs = (value) => Math.max(0, Math.min(999, Math.floor(Number(value) || 0)))

export const OpeningStockGrid = ({ colors, sizes, value, onChange }) => {
  const [fill, setFill] = useState("")
  const total = colors.reduce((sum, color) => sum + sizes.reduce((inner, size) => inner + toPairs(value[stockKey(color, size)]), 0), 0)

  const handleFill = () => {
    const pairs = toPairs(fill)
    onChange(Object.fromEntries(colors.flatMap((color) => sizes.map((size) => [stockKey(color, size), pairs]))))
  }

  if (!colors.length || !sizes.length) return <p className="text-sm text-muted-foreground">Add colours and sizes above, then enter how many pairs you have.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <Input value={fill} onChange={(event) => setFill(event.target.value)} inputMode="numeric" placeholder="e.g. 5" className="w-24 tabular-nums" aria-label="Pairs for every size" />
        <Button type="button" size="sm" variant="outline" onClick={handleFill}>
          Set all sizes
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          Total <span className="font-semibold text-foreground tabular-nums">{total}</span> pairs
        </span>
      </div>
      {colors.map((color) => (
        <div key={color} className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-medium">
            <ColorDot color={color} />
            {color}
          </p>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {sizes.map((size) => {
              const key = stockKey(color, size)
              return (
                <label key={key} className="flex flex-col items-center gap-1 border px-1 pt-1 pb-1.5 focus-within:border-primary">
                  <span className="text-[0.6rem] text-muted-foreground tabular-nums">EU {size}</span>
                  <input
                    value={value[key] ?? ""}
                    onChange={(event) => onChange({ ...value, [key]: event.target.value.replace(/\D/g, "").slice(0, 3) })}
                    inputMode="numeric"
                    placeholder="0"
                    aria-label={`${color} EU ${size} pairs`}
                    className="w-full bg-transparent text-center text-sm font-semibold tabular-nums outline-none placeholder:text-muted-foreground/60 pointer-coarse:text-base"
                  />
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
