import { cn } from "cn"
import { colorValue, swatchStyle } from "../lib/colors"

export const ColorDot = ({ color = "", className }) => {
  const parts = String(color || "").split("/").map((part) => part.trim())

  if (parts.length === 2) {
    const c1 = colorValue(parts[0])
    const c2 = colorValue(parts[1])
    if (c1 && c2) {
      return (
        <span
          title={color}
          aria-hidden="true"
          className={cn("inline-flex items-center -space-x-1 shrink-0", className)}
        >
          <span
            className="inline-block size-2.5 rounded-full border border-background shadow-xs ring-1 ring-foreground/20"
            style={{ backgroundColor: c1 }}
          />
          <span
            className="inline-block size-2.5 rounded-full border border-background shadow-xs ring-1 ring-foreground/20"
            style={{ backgroundColor: c2 }}
          />
        </span>
      )
    }
  }

  const style = swatchStyle(color)
  return (
    <span
      title={color}
      aria-hidden="true"
      className={cn(
        "inline-block size-3 shrink-0 rounded-full border border-foreground/20",
        !style && "border-dashed border-muted-foreground",
        className
      )}
      style={style ?? undefined}
    />
  )
}
