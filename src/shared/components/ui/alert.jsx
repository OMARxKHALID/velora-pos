import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ssr"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { Button } from "@/shared/components/ui/button"

export const toneClasses = {
  warning: "border-warning/40 bg-warning/10 text-warning",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-info/40 bg-info/10 text-info",
  success: "border-success/40 bg-success/10 text-success",
}

const alertVariants = cva("group/alert relative flex w-full flex-wrap items-center gap-x-3 gap-y-2 border px-3 py-2 text-left text-xs [&>svg]:size-4 [&>svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground",
      ...toneClasses,
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export const Alert = ({ className, variant, role = "status", ...props }) => <div data-slot="alert" role={role} className={cn(alertVariants({ variant }), className)} {...props} />

export const AlertTitle = ({ className, ...props }) => <div data-slot="alert-title" className={cn("font-semibold", className)} {...props} />

export const AlertDescription = ({ className, ...props }) => <div data-slot="alert-description" className={cn("min-w-0 flex-1", className)} {...props} />

export const AlertAction = ({ className, ...props }) => <div data-slot="alert-action" className={cn("shrink-0", className)} {...props} />

export const LoadError = ({ message, onRetry, className }) => (
  <Alert variant="destructive" role="alert" className={cn("flex-col items-start gap-3 p-4 text-sm text-foreground", className)}>
    <AlertDescription>{message}</AlertDescription>
    {onRetry && (
      <AlertAction>
        <Button size="sm" variant="outline" onClick={() => onRetry()}>
          <ArrowsClockwiseIcon />
          Try again
        </Button>
      </AlertAction>
    )}
  </Alert>
)
