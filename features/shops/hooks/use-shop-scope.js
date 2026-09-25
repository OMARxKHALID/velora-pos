import { useCallback } from "react"
import { useShallow } from "zustand/react/shallow"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { ALL_SHOPS, settingsFor, shopName, staffShopId } from "../lib/shops"

export const useShopScope = (user) => {
  const scope = useDemoStore(({ shopScope }) => shopScope)
  const ownShop = useDemoStore(({ staff }) => staffShopId(staff[user?.id] ?? user))
  return !user || user.role === "admin" ? scope : ownShop
}

export const useShop = (shopId) => useDemoStore(({ shops }) => shops.find(({ id }) => id === shopId) ?? null)

export const useShopNameOf = () => {
  const shops = useDemoStore(({ shops }) => shops)
  return (person) => (person?.role === "admin" ? "Head office" : shopName(shops, staffShopId(person)))
}

export const useSettingsFor = (shopId) => useDemoStore(useShallow(({ settings, shops }) => settingsFor(settings, shops, shopId === ALL_SHOPS ? null : shopId)))

export const useLowLimitOf = () => {
  const settings = useDemoStore(({ settings }) => settings)
  const shops = useDemoStore(({ shops }) => shops)
  return useCallback((shopId) => settingsFor(settings, shops, shopId).lowStockThreshold, [settings, shops])
}
