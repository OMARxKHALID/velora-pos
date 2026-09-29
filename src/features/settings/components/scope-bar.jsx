"use client"

import { StorefrontIcon, TreeStructureIcon } from "@phosphor-icons/react"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"

export const ScopeBar = ({ shopId }) => {
  const shop = useLedgerStore(({ shops }) => shops.find(({ id }) => id === shopId))

  if (!shopId) {
    return (
      <Alert className="items-start bg-muted/40 text-muted-foreground @4xl:col-span-2 [&>svg]:text-gold">
        <TreeStructureIcon />
        <AlertDescription>Changes here apply to every shop. Pick a shop in the switcher to change it alone.</AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-primary/40 bg-accent/40 @4xl:col-span-2 [&>svg]:text-gold">
      <StorefrontIcon />
      <AlertDescription>
        Changes here apply to <span className="font-semibold text-foreground">{shop?.name}</span> only.
      </AlertDescription>
    </Alert>
  )
}
