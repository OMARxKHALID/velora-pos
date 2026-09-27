import { cn } from "cn"

export const EmptyState = ({ className, children }) => <p className={cn("px-4 py-12 text-center text-sm text-muted-foreground", className)}>{children}</p>
