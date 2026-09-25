"use client"

import { BootIcon, DropIcon, HighHeelIcon, PaintBrushIcon, SneakerIcon, SneakerMoveIcon, SockIcon, SprayBottleIcon, TShirtIcon, TagIcon } from "@phosphor-icons/react"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { categoryFor } from "../lib/catalog"

export const categoryIcons = {
  sneaker: SneakerIcon,
  "sneaker-move": SneakerMoveIcon,
  heel: HighHeelIcon,
  boot: BootIcon,
  sock: SockIcon,
  tshirt: TShirtIcon,
  brush: PaintBrushIcon,
  drop: DropIcon,
  spray: SprayBottleIcon,
  tag: TagIcon,
}

export const IconForKey = ({ icon, className, weight = "thin" }) => {
  const Icon = categoryIcons[icon] ?? SneakerIcon
  return <Icon className={className} weight={weight} />
}

export const CategoryIcon = ({ category, className }) => {
  const icon = useLedgerStore(({ categories }) => categoryFor(categories, category)?.icon)
  return <IconForKey icon={icon} className={className} />
}
