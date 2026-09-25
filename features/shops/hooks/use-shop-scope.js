import { useCallback } from "react"
import { useShallow } from "zustand/react/shallow"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { ALL_SHOPS, settingsFor, shopName, staffShopId } from "../lib/shops"

export const useShopScope = (user) => {
  const scope = useLedgerStore(({ shopScope }) => shopScope)
  const ownShop = useLedgerStore(({ staff }) => staffShopId(staff[user?.id] ?? user))
  return !user || user.role === "admin" ? scope : ownShop
}

export const useShop = (shopId) => useLedgerStore(({ shops }) => shops.find(({ id }) => id === shopId) ?? null)

export const useShopNameOf = () => {
  const shops = useLedgerStore(({ shops }) => shops)
  return (person) => (person?.role === "admin" ? "Head office" : shopName(staffShopId(person), shops))
}

export const useSettingsFor = (shopId) => useLedgerStore(useShallow(({ settings, shops }) => settingsFor(settings, shops, shopId === ALL_SHOPS ? null : shopId)))

export const useLowLimitOf = () => {
  const settings = useLedgerStore(({ settings }) => settings)
  const shops = useLedgerStore(({ shops }) => shops)
  return useCallback((shopId) => settingsFor(settings, shops, shopId).lowStockThreshold, [settings, shops])
}
