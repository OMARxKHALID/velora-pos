import { Badge } from "@/shared/components/ui/badge"

export const StatusBadge = ({ tone = "muted", children }) => <Badge variant={tone}>{children}</Badge>

const FLAGS = {
  price_mismatch: ["warning", "Price differs"],
  total_mismatch: ["warning", "Total differs"],
  negative_stock: ["warning", "Oversold"],
  renumbered: ["info", "Renumbered"],
  after_close: ["warning", "After close"],
  clock: ["warning", "Till clock off"],
}

export const SaleStatusBadges = ({ sale, refundState }) => (
  <div className="flex flex-wrap gap-1">
    {refundState.pending && <StatusBadge tone="warning">Return pending</StatusBadge>}
    {refundState.refunded && <StatusBadge tone="destructive">{refundState.refunded === "full" ? "Returned" : "Part returned"}</StatusBadge>}
    {!sale.syncedAt && <StatusBadge tone="info">Not synced</StatusBadge>}
    {sale.offline && sale.syncedAt && <StatusBadge tone="info">Sold offline</StatusBadge>}
    {sale.flags
      ?.filter((flag) => FLAGS[flag])
      .map((flag) => (
        <StatusBadge key={flag} tone={FLAGS[flag][0]}>
          {FLAGS[flag][1]}
        </StatusBadge>
      ))}
    {sale.fbr?.status === "pending" && <StatusBadge tone="warning">FBR pending</StatusBadge>}
  </div>
)
