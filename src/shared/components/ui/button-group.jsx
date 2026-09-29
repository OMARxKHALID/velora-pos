"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority"
import { cn } from "cn"

export const buttonGroupVariants = cva(
  "flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 *:data-[slot=input]:px-4 [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal: "[&>[data-slot]~[data-slot]]:border-l-0",
        vertical: "flex-col [&>[data-slot]~[data-slot]]:border-t-0",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)

export const ButtonGroup = ({ className, orientation, ...props }) => (
  <div role="group" data-slot="button-group" data-orientation={orientation} className={cn(buttonGroupVariants({ orientation }), className)} {...props} />
)

export const ButtonGroupText = ({ className, render, ...props }) =>
  useRender({
    defaultTagName: "div",
    render,
    props: mergeProps(
      {
        className: cn(
          "flex items-center gap-2 border border-border bg-transparent px-2.5 text-xs font-semibold uppercase [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
          className
        ),
      },
      props
    ),
    state: { slot: "button-group-text" },
  })
