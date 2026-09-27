import { cn } from "cn"

export const surface = "border bg-card shadow-xs dark:shadow-md dark:shadow-black/30"

export const Surface = ({ className, ...props }) => <div className={cn(surface, className)} {...props} />
