import { cn } from "cn"
import { swatchStyle } from "../lib/colors"

export const ColorDot = ({ color = "", className }) => {
  const style = swatchStyle(String(color || ""))
  return (
    <span
      title={color}
      aria-hidden="true"
      className={cn(
        "inline-block size-3.5 shrink-0 rounded-full border border-foreground/20",
        !style && "border-dashed border-muted-foreground",
        className
      )}
      style={style ?? undefined}
    />
  )
}
