import { cn } from "cn"
import { SpinnerIcon } from "@phosphor-icons/react/ssr"

function Spinner({
  className,
  ...props
}) {
  return (
    <SpinnerIcon data-slot="spinner" role="status" aria-label="Loading" className={cn("animate-spin", className)} {...props} />
  )
}

export { Spinner }
