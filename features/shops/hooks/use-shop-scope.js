import { useDemoStore } from "@/features/demo/store/demo-store-provider"

export const useShopScope = (user) => {
  const scope = useDemoStore(({ shopScope }) => shopScope)
  return user.role === "admin" ? scope : user.shopId
}
