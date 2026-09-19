import { cn } from "cn"

export const Segmented = ({ options, value, onChange, className }) => (
  <div className={cn("flex w-fit max-w-full overflow-x-auto border", className)}>
    {options.map(({ key, label }) => (
      <button
        key={key}
        type="button"
        onClick={() => onChange(key)}
        className={cn(
          "h-8 shrink-0 px-3 pointer-coarse:h-11 pointer-coarse:px-4 text-[0.65rem] font-semibold tracking-widest whitespace-nowrap uppercase transition-colors",
          value === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
      </button>
    ))}
  </div>
)
