import { cn } from "cn"

export const VeloraLogo = ({ className, compact = false }) => (
  <div className={cn("flex items-center gap-2.5", className)}>
    <span
      className={cn(
        "flex shrink-0 items-center justify-center border border-primary/40 bg-linear-to-b from-[#b8892a] via-[#8a6a1f] to-[#5c4712] bg-clip-text font-heading font-bold text-transparent dark:from-[#f5d77a] dark:via-[#d4af37] dark:to-[#8a6a1f]",
        compact ? "size-8 text-xl" : "size-9 text-2xl"
      )}
    >
      V
    </span>
    {!compact && (
      <div className="flex min-w-0 flex-col leading-none">
        <span className="bg-linear-to-b from-[#b8892a] via-[#8a6a1f] to-[#5c4712] dark:from-[#f5d77a] dark:via-[#d4af37] dark:to-[#8a6a1f] bg-clip-text font-heading text-lg font-bold tracking-label text-transparent">
          VELORA
        </span>
        <span className="mt-1 text-2xs tracking-[0.4em] text-muted-foreground uppercase">
          Group · POS
        </span>
      </div>
    )}
  </div>
)
