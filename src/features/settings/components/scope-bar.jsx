"use client"

import { StorefrontIcon, TreeStructureIcon } from "@phosphor-icons/react"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"

export const ScopeBar = ({ shopId }) => {
  const shop = useLedgerStore(({ shops }) => shops.find(({ id }) => id === shopId))

  if (!shopId) {
    return (
      <div className="flex items-start gap-2 border bg-muted/40 px-3 py-2 text-xs text-muted-foreground @4xl:col-span-2">
        <TreeStructureIcon className="size-4 shrink-0 text-gold" />
        <span>Changes here apply to every shop. Pick a shop in the switcher to change it alone.</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 border border-primary/40 bg-accent/40 px-3 py-2 text-xs @4xl:col-span-2">
      <StorefrontIcon className="size-4 shrink-0 text-gold" />
      <span>
        Changes here apply to <span className="font-semibold text-foreground">{shop?.name}</span> only.
      </span>
    </div>
  )
}
