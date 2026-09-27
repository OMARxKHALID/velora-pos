import { cn } from "cn"
import { surface } from "@/shared/components/ui/surface"

export const StatStrip = ({ stats, className }) => (
  <dl className={cn("grid grid-cols-2 @2xl:grid-cols-4", surface, className)}>
    {stats.map(({ label, value, tone, hint }) => (
      <div key={label} className="@container min-w-0 border-b px-3 py-3 odd:border-r nth-last-2:odd:border-b-0 last:border-b-0 @xs:px-4 @2xl:border-r @2xl:border-b-0 @2xl:last:border-r-0">
        <dt className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">{label}</dt>
        <dd className={cn("mt-1 font-sans text-[clamp(0.875rem,13.5cqi,1.25rem)] leading-7 font-bold whitespace-nowrap tabular-nums", tone === "warning" && "text-warning", tone === "destructive" && "text-destructive")}>
          {value}
        </dd>
        {hint && <dd className="mt-1 text-xs text-muted-foreground">{hint}</dd>}
      </div>
    ))}
  </dl>
)
