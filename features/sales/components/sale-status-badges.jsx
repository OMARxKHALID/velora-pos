import { cn } from "cn"

const tones = {
  warning: "border-warning/40 bg-warning/10 text-warning",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-info/40 bg-info/10 text-info",
  gold: "border-primary/50 bg-accent text-accent-foreground",
  muted: "border-border text-muted-foreground",
}

export const StatusBadge = ({ tone = "muted", children }) => (
  <span className={cn("inline-flex h-5 items-center border px-1.5 text-2xs font-semibold tracking-widest whitespace-nowrap uppercase", tones[tone])}>
    {children}
  </span>
)

export const SaleStatusBadges = ({ sale, refundState }) => (
  <div className="flex flex-wrap gap-1">
    {refundState.pending && <StatusBadge tone="warning">Refund pending</StatusBadge>}
    {refundState.refunded && <StatusBadge tone="destructive">{refundState.refunded === "full" ? "Refunded" : "Part refunded"}</StatusBadge>}
    {!sale.syncedAt && <StatusBadge tone="info">Not synced</StatusBadge>}
    {sale.fbr?.status === "pending" && <StatusBadge tone="warning">FBR pending</StatusBadge>}
  </div>
)
