import { cn } from "cn"
import { surface } from "@/shared/components/ui/surface"

export const Panel = ({ title, description, action, children, className }) => (
  <section className={cn("flex min-w-0 flex-col", surface, className)}>
    <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
    <div className="min-w-0 flex-1">{children}</div>
  </section>
)
