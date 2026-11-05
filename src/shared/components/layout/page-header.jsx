export const PageHeader = ({ title, description, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div className="space-y-1">
      <h1 className="font-heading text-2xl font-semibold tracking-display text-balance uppercase">{title}</h1>
      {description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
    </div>
    {children}
  </div>
)
