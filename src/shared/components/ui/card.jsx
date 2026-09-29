import { cn } from "cn"

export const surface = "border bg-card shadow-xs dark:shadow-md dark:shadow-black/30"

export const Card = ({ className, size = "default", ...props }) => (
  <div
    data-slot="card"
    data-size={size}
    className={cn(
      surface,
      "group/card flex flex-col gap-(--card-spacing) overflow-hidden py-(--card-spacing) text-sm text-card-foreground [--card-spacing:--spacing(8)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(5)] *:[img:first-child]:rounded-none *:[img:last-child]:rounded-none",
      className
    )}
    {...props}
  />
)

export const CardHeader = ({ className, ...props }) => (
  <div
    data-slot="card-header"
    className={cn(
      "group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-none px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
      className
    )}
    {...props}
  />
)

export const CardTitle = ({ className, ...props }) => <div data-slot="card-title" className={cn("text-base font-semibold", className)} {...props} />

export const CardDescription = ({ className, ...props }) => <div data-slot="card-description" className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />

export const CardAction = ({ className, ...props }) => <div data-slot="card-action" className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props} />

export const CardContent = ({ className, ...props }) => <div data-slot="card-content" className={cn("px-(--card-spacing)", className)} {...props} />

export const CardFooter = ({ className, ...props }) => <div data-slot="card-footer" className={cn("flex items-center px-(--card-spacing) [.border-t]:pt-(--card-spacing)", className)} {...props} />
