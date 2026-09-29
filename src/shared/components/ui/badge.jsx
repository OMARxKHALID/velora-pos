"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { toneClasses } from "@/shared/components/ui/alert"

export const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border px-1.5 text-2xs font-semibold tracking-label whitespace-nowrap uppercase transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        muted: "border-border text-muted-foreground",
        gold: "border-primary/50 bg-accent text-accent-foreground",
        brand: "border-gold/40 bg-gold/10 text-gold",
        ...toneClasses,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export const Badge = ({ className, variant = "default", render, ...props }) =>
  useRender({
    defaultTagName: "span",
    props: mergeProps({ className: cn(badgeVariants({ variant }), className) }, props),
    render,
    state: { slot: "badge", variant },
  })
