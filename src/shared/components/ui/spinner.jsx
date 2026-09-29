import { cn } from "cn"
import { SpinnerIcon } from "@phosphor-icons/react/ssr"

export const Spinner = ({ className, ...props }) => <SpinnerIcon data-slot="spinner" role="status" aria-label="Loading" className={cn("animate-spin", className)} {...props} />
