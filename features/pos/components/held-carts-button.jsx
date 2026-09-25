"use client"

import { PauseCircleIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"

const heldLabel = (count) => `${count} ${count === 1 ? "held cart" : "held carts"}`

const CountBadge = ({ count, className }) => (
  <span className={cn("flex size-5 items-center justify-center bg-primary text-2xs font-bold text-primary-foreground tabular-nums", className)}>{count}</span>
)

export const HeldCartsButton = ({ count, onClick, variant = "panel", className }) => {
  const active = count > 0

  if (variant === "mobile") {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className={cn("relative shrink-0 border-gold/50 bg-gold/10 text-gold hover:bg-gold/20", className)}
        onClick={onClick}
        aria-label={heldLabel(count)}
      >
        <PauseCircleIcon className="size-5" />
        <CountBadge count={count} className="absolute -top-1.5 -right-1.5" />
      </Button>
    )
  }

  if (variant === "bar") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("shrink-0 border-gold/50 bg-gold/10 text-gold hover:bg-gold/20", className)}
        onClick={onClick}
      >
        <PauseCircleIcon />
        {heldLabel(count)}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={!active}
      onClick={onClick}
      title={active ? `${heldLabel(count)} waiting` : "No held carts"}
      className={cn("w-full px-2", active && "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20", className)}
    >
      <PauseCircleIcon />
      Held
      {active && <CountBadge count={count} />}
    </Button>
  )
}
