import { useCallback } from "react"
import { toast } from "sonner"
import { CART_STORAGE_KEY } from "@/features/pos/store/cart-store"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"

export const useResetDemo = () => {
  const resetDemo = useLedgerStore(({ resetDemo }) => resetDemo)

  return useCallback(async () => {
    try {
      await resetDemo()
      try {
        window.sessionStorage.removeItem(CART_STORAGE_KEY)
      } catch {}
      toast.success("Demo data reset", { description: "30 days of fresh sales, shifts and refunds. The team, passwords, PINs and settings are back to the demo defaults." })
    } catch (error) {
      toast.error(error.message)
    }
  }, [resetDemo])
}
