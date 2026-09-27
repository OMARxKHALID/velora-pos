import { cn } from "cn"
import { roleLabels } from "@/features/auth/lib/roles"

const colors = {
  admin: "border-gold/40 bg-gold/10 text-gold",
  manager: "border-primary/40 bg-accent text-accent-foreground",
  cashier: "border-border bg-secondary text-secondary-foreground",
}

export const RoleBadge = ({ role, className }) => (
  <span className={cn("inline-flex h-5 items-center border px-1.5 text-2xs font-semibold tracking-label uppercase", colors[role], className)}>
    {roleLabels[role] ?? role}
  </span>
)
