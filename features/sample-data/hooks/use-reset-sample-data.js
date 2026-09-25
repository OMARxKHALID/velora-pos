import { useCallback } from "react"
import { toast } from "sonner"
import { CART_STORAGE_KEY } from "@/features/pos/store/cart-store"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"

export const useResetSampleData = () => {
  const resetSampleData = useLedgerStore(({ resetSampleData }) => resetSampleData)

  return useCallback(async () => {
    try {
      await resetSampleData()
      try {
        window.sessionStorage.removeItem(CART_STORAGE_KEY)
      } catch {}
      toast.success("Sample data reset", { description: "30 days of fresh sales, shifts and refunds. The team, passwords, PINs and settings are back to the sample defaults." })
    } catch (error) {
      toast.error(error.message)
    }
  }, [resetSampleData])
}
