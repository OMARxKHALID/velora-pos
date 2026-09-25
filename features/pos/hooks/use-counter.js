import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"

export const useCounter = (user) => useLedgerStore(({ registers }) => registers.find(({ shopId }) => shopId === user.shopId) ?? null)
