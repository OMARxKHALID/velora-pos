import { cn } from "cn"

export const Segmented = ({ options, value, onChange, className, label }) => (
  <div role="group" data-slot="segmented" aria-label={label} className={cn("flex w-fit max-w-full overflow-x-auto border", className)}>
    {options.map(({ key, label: text }) => (
      <button
        key={key}
        type="button"
        aria-pressed={value === key}
        onClick={() => onChange(key)}
        className={cn(
          "h-9 shrink-0 px-3 text-xs font-medium whitespace-nowrap transition-colors pointer-coarse:h-11 pointer-coarse:px-4",
          value === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {text}
      </button>
    ))}
  </div>
)
