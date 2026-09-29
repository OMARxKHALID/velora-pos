"use client"

import { MinusIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/shared/components/ui/button"
import { ButtonGroup, ButtonGroupText } from "@/shared/components/ui/button-group"

export const QuantityStepper = ({ value, onChange, min = 0, max = Infinity, onRemove, size = "sm", label = "Quantity", lessLabel = "One less", moreLabel = "One more", className }) => {
  const removing = Boolean(onRemove) && value <= 1
  const buttonSize = size === "xs" ? "icon-xs" : "icon-sm"

  return (
    <ButtonGroup aria-label={label} className={cn("shrink-0", className)}>
      <Button type="button" size={buttonSize} variant="outline" aria-label={removing ? "Remove" : lessLabel} disabled={!removing && value <= min} onClick={() => (removing ? onRemove() : onChange(value - 1))}>
        {removing ? <TrashIcon /> : <MinusIcon />}
      </Button>
      <ButtonGroupText aria-live="polite" className={cn("justify-center px-0 text-sm tabular-nums normal-case select-none", size === "xs" ? "w-8" : "w-9")}>
        {value}
      </ButtonGroupText>
      <Button type="button" size={buttonSize} variant="outline" aria-label={moreLabel} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <PlusIcon />
      </Button>
    </ButtonGroup>
  )
}
