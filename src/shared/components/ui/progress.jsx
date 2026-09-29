"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "cn"

export const ProgressTrack = ({ className, ...props }) => (
  <ProgressPrimitive.Track data-slot="progress-track" className={cn("relative flex h-0.5 w-full items-center overflow-x-hidden rounded-none bg-muted", className)} {...props} />
)

export const ProgressIndicator = ({ className, ...props }) => <ProgressPrimitive.Indicator data-slot="progress-indicator" className={cn("h-full bg-primary transition-[width] duration-300 ease-out", className)} {...props} />

export const ProgressLabel = ({ className, ...props }) => <ProgressPrimitive.Label data-slot="progress-label" className={cn("text-xs font-semibold tracking-wide uppercase", className)} {...props} />

export const ProgressValue = ({ className, ...props }) => <ProgressPrimitive.Value data-slot="progress-value" className={cn("ml-auto text-sm text-muted-foreground tabular-nums", className)} {...props} />

export const Progress = ({ className, trackClassName, indicatorClassName, children, value, ...props }) => (
  <ProgressPrimitive.Root value={value} data-slot="progress" className={cn("flex flex-wrap gap-3", className)} {...props}>
    {children}
    <ProgressTrack className={trackClassName}>
      <ProgressIndicator className={indicatorClassName} />
    </ProgressTrack>
  </ProgressPrimitive.Root>
)
