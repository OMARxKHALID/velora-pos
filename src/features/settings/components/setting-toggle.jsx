import { Segmented } from "@/shared/components/ui/segmented"

const options = [
  { key: "off", label: "Off" },
  { key: "on", label: "On" },
]

export const SettingToggle = ({ on, onChange, label, description }) => (
  <div className="flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <Segmented label={label} options={options} value={on ? "on" : "off"} onChange={(value) => onChange(value === "on")} />
  </div>
)
