"use client"

import { useId } from "react"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"

export const SettingToggle = ({ on, onChange, label, description }) => {
  const id = useId()

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={on} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  )
}
