"use client"

import { ArrowCounterClockwiseIcon, StorefrontIcon, TreeStructureIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { overriddenKeys } from "@/features/shops/lib/shops"

export const ScopeBar = ({ shopId, keys }) => {
  const shops = useLedgerStore(({ shops }) => shops)
  const resetShopSettings = useLedgerStore(({ resetShopSettings }) => resetShopSettings)

  if (!shopId) {
    const custom = shops.filter((shop) => overriddenKeys(shop, keys).length)
    return (
      <div className="flex items-start gap-2 border bg-muted/40 px-3 py-2 text-xs text-muted-foreground @4xl:col-span-2">
        <TreeStructureIcon className="mt-0.5 size-4 shrink-0 text-gold" />
        <span>
          Group settings, used by every shop.
          {custom.length > 0 && ` ${custom.map(({ name }) => name).join(", ")} ${custom.length === 1 ? "has" : "have"} its own for some of these.`} Pick a shop in the switcher to change it alone.
        </span>
      </div>
    )
  }

  const shop = shops.find(({ id }) => id === shopId)
  const custom = overriddenKeys(shop, keys)

  const handleReset = () => {
    resetShopSettings({ shopId, keys })
    toast.success(`${shop.name} uses the group settings again`)
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border border-primary/40 bg-accent/40 px-3 py-2 text-xs @4xl:col-span-2">
      <StorefrontIcon className="size-4 shrink-0 text-gold" />
      <span className="min-w-0 flex-1">
        {custom.length ? (
          <>
            <span className="font-semibold text-foreground">Custom for {shop?.name}.</span> Changes here apply to this shop only.
          </>
        ) : (
          <>
            {shop?.name} uses the group settings. Change anything here to give it its own.
          </>
        )}
      </span>
      {custom.length > 0 && (
        <Button type="button" size="xs" variant="outline" onClick={handleReset}>
          <ArrowCounterClockwiseIcon />
          Use group settings
        </Button>
      )}
    </div>
  )
}
