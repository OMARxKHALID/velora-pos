import { Badge } from "@/shared/components/ui/badge"
import { roleLabels } from "@/features/auth/lib/roles"

const variants = { admin: "brand", manager: "gold", cashier: "secondary" }

export const RoleBadge = ({ role, className }) => (
  <Badge variant={variants[role] ?? "muted"} className={className}>
    {roleLabels[role] ?? role}
  </Badge>
)
