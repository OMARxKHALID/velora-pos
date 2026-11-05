import { cn } from "cn"

export const DialogIcon = ({ className, children }) => (
  <div data-slot="dialog-icon" className={cn("mb-2 flex size-11 items-center justify-center border border-primary/40 text-gold [&_svg:not([class*='size-'])]:size-5", className)}>
    {children}
  </div>
)
