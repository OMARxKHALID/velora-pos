import { BootIcon, HighHeelIcon, SneakerIcon, SneakerMoveIcon } from "@phosphor-icons/react"

const icons = { Heels: HighHeelIcon, Boots: BootIcon, Sports: SneakerMoveIcon }

export const CategoryIcon = ({ category, className }) => {
  const Icon = icons[category] ?? SneakerIcon
  return <Icon className={className} weight="thin" />
}
