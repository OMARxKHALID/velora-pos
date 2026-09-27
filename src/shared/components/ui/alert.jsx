import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ssr"
import { cn } from "cn"
import { Button } from "@/shared/components/ui/button"

export const toneClasses = {
  warning: "border-warning/40 bg-warning/10 text-warning",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-info/40 bg-info/10 text-info",
  success: "border-success/40 bg-success/10 text-success",
}

export const Alert = ({ tone = "info", role = "status", icon, action, className, children }) => (
  <div role={role} className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 border px-3 py-2 text-xs", toneClasses[tone], className)}>
    {icon}
    <div className="min-w-0 flex-1">{children}</div>
    {action}
  </div>
)

export const LoadError = ({ message, onRetry, className }) => (
  <div role="alert" className={cn("flex flex-col items-start gap-3 border border-destructive/40 bg-destructive/10 p-4 text-sm", className)}>
    <p>{message}</p>
    {onRetry && (
      <Button size="sm" variant="outline" onClick={() => onRetry()}>
        <ArrowsClockwiseIcon />
        Try again
      </Button>
    )}
  </div>
)
