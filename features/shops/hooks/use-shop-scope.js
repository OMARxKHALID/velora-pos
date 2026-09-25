import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"

export const useShopScope = (user) => {
  const scope = useLedgerStore(({ shopScope }) => shopScope)
  return user.role === "admin" ? scope : user.shopId
}
