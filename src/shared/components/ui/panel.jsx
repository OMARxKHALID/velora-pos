import { cn } from "cn"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"

export const Panel = ({ title, description, action, children, className }) => (
  <Card className={cn("min-w-0 gap-0 overflow-visible py-0", className)}>
    <CardHeader className="gap-x-3 gap-y-0.5 border-b px-4 py-3 [.border-b]:pb-3">
      <CardTitle role="heading" aria-level={2} className="min-w-0">
        {title}
      </CardTitle>
      {description && <CardDescription className="text-xs leading-normal">{description}</CardDescription>}
      {action && <CardAction>{action}</CardAction>}
    </CardHeader>
    <CardContent className="min-w-0 flex-1 px-0">{children}</CardContent>
  </Card>
)
