import { cn } from "cn"

export const StatStrip = ({ stats, className }) => (
  <dl className={cn("grid grid-cols-2 border bg-card @2xl:grid-cols-4", className)}>
    {stats.map(({ label, value, tone, hint }) => (
      <div key={label} className="border-b px-4 py-3 odd:border-r @2xl:border-r @2xl:border-b-0 @2xl:last:border-r-0">
        <dt className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">{label}</dt>
        <dd className={cn("mt-1 font-sans text-xl font-bold tabular-nums", tone === "warning" && "text-warning", tone === "destructive" && "text-destructive")}>
          {value}
        </dd>
        {hint && <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>}
      </div>
    ))}
  </dl>
)
