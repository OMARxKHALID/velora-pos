import { cn } from "cn"

export const StatStrip = ({ stats, className }) => (
  <dl className={cn("grid grid-cols-2 border bg-card md:grid-cols-4", className)}>
    {stats.map(({ label, value, tone, hint }) => (
      <div key={label} className="border-b px-4 py-3 odd:border-r md:border-r md:border-b-0 md:last:border-r-0">
        <dt className="text-[0.6rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">{label}</dt>
        <dd className={cn("mt-1 font-heading text-xl font-bold tabular-nums", tone === "warning" && "text-warning", tone === "destructive" && "text-destructive")}>
          {value}
        </dd>
        {hint && <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>}
      </div>
    ))}
  </dl>
)
