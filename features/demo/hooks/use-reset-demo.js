import { useCallback } from "react"
import { toast } from "sonner"
import { resetDemoTeamAction } from "../actions"
import { useDemoStore } from "../store/demo-store-provider"

export const useResetDemo = () => {
  const resetDemo = useDemoStore(({ resetDemo }) => resetDemo)

  return useCallback(async () => {
    const result = await resetDemoTeamAction().catch(() => ({ error: "Could not reach the server. Check the connection." }))
    if (result.error) return toast.error(result.error)
    resetDemo()
    toast.success("Demo data reset", { description: "30 days of fresh sales, shifts and refunds. The team, passwords, PINs and settings are back to the demo defaults." })
  }, [resetDemo])
}
