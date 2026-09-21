import { cn } from "cn"

export const Segmented = ({ options, value, onChange, className, label }) => (
  <div role="group" aria-label={label} className={cn("flex w-fit max-w-full overflow-x-auto border", className)}>
    {options.map(({ key, label: text }) => (
      <button
        key={key}
        type="button"
        aria-pressed={value === key}
        onClick={() => onChange(key)}
        className={cn(
          "h-9 shrink-0 px-3 text-2xs font-semibold tracking-widest whitespace-nowrap uppercase transition-colors pointer-coarse:h-11 pointer-coarse:px-4",
          value === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {text}
      </button>
    ))}
  </div>
)
