import { cva } from "class-variance-authority"
import { cn } from "cn"

export const Empty = ({ className, ...props }) => (
  <div data-slot="empty" className={cn("flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 border-dashed px-4 py-12 text-center text-balance", className)} {...props} />
)

export const EmptyHeader = ({ className, ...props }) => <div data-slot="empty-header" className={cn("flex max-w-sm flex-col items-center gap-2", className)} {...props} />

const emptyMediaVariants = cva("mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-transparent",
      icon: "flex size-10 shrink-0 items-center justify-center rounded-none bg-muted text-foreground [&_svg:not([class*='size-'])]:size-5",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export const EmptyMedia = ({ className, variant = "default", ...props }) => <div data-slot="empty-icon" data-variant={variant} className={cn(emptyMediaVariants({ variant, className }))} {...props} />

export const EmptyTitle = ({ className, ...props }) => <div data-slot="empty-title" className={cn("font-heading text-lg font-semibold tracking-display uppercase", className)} {...props} />

export const EmptyDescription = ({ className, ...props }) => (
  <div data-slot="empty-description" className={cn("text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary", className)} {...props} />
)

export const EmptyContent = ({ className, ...props }) => <div data-slot="empty-content" className={cn("flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance", className)} {...props} />
