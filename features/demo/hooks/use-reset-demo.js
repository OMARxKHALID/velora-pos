import { useCallback } from "react"
import { toast } from "sonner"
import { resetStaffAccess } from "@/features/auth/actions"
import { useDemoStore } from "../store/demo-store-provider"

export const useResetDemo = () => {
  const resetDemo = useDemoStore(({ resetDemo }) => resetDemo)

  return useCallback(async () => {
    resetDemo()
    await resetStaffAccess()
    toast.success("Demo data reset", { description: "30 days of fresh sales, shifts and refunds. Staff and settings are back to defaults." })
  }, [resetDemo])
}
