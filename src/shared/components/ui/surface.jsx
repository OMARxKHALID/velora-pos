import { cn } from "cn"
import { Card, surface } from "@/shared/components/ui/card"

export { surface }

export const Surface = ({ className, ...props }) => <Card className={cn("gap-0 overflow-visible py-0", className)} {...props} />
