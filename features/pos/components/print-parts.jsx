import { cn } from "cn"

export const PrintRow = ({ label, value, strong, className }) => (
  <div className={cn("flex justify-between gap-2", strong && "font-bold", className)}>
    <span className="shrink-0">{label}</span>
    <span className="truncate text-right tabular-nums">{value}</span>
  </div>
)

export const PrintRule = ({ className }) => <div className={cn("my-2.5 border-t border-dashed border-black", className)} />
