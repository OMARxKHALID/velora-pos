"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority"
import { cn } from "cn"

export const ItemGroup = ({ className, ...props }) => (
  <div role="list" data-slot="item-group" className={cn("group/item-group flex w-full flex-col gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2", className)} {...props} />
)

const itemVariants = cva(
  "group/item flex w-full flex-wrap items-center rounded-none border text-left text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring [a]:transition-colors [a]:hover:bg-muted [button]:cursor-pointer",
  {
    variants: {
      variant: {
        default: "border-transparent",
        outline: "border-border bg-card",
        muted: "border-transparent bg-muted/50",
      },
      size: {
        default: "gap-3.5 px-4 py-3.5",
        sm: "gap-3 px-4 py-2.5",
        xs: "gap-2.5 px-3 py-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export const Item = ({ className, variant = "default", size = "default", render, ...props }) =>
  useRender({
    defaultTagName: "div",
    render,
    props: mergeProps({ className: cn(itemVariants({ variant, size, className })) }, props),
    state: { slot: "item", variant, size },
  })

const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "size-9 border border-primary/40 text-gold [&_svg:not([class*='size-'])]:size-4",
        image: "size-10 overflow-hidden rounded-none group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export const ItemMedia = ({ className, variant = "default", ...props }) => <div data-slot="item-media" data-variant={variant} className={cn(itemMediaVariants({ variant, className }))} {...props} />

export const ItemContent = ({ className, ...props }) => (
  <div data-slot="item-content" className={cn("flex min-w-0 flex-1 flex-col gap-0.5 [&+[data-slot=item-content]]:flex-none", className)} {...props} />
)

export const ItemTitle = ({ className, ...props }) => <div data-slot="item-title" className={cn("min-w-0 truncate text-sm leading-snug", className)} {...props} />

export const ItemDescription = ({ className, ...props }) => <p data-slot="item-description" className={cn("line-clamp-2 text-left text-xs font-normal text-muted-foreground", className)} {...props} />

export const ItemActions = ({ className, ...props }) => <div data-slot="item-actions" className={cn("flex shrink-0 items-center gap-2", className)} {...props} />

export const ItemFooter = ({ className, ...props }) => <div data-slot="item-footer" className={cn("flex basis-full items-center justify-between gap-2", className)} {...props} />
