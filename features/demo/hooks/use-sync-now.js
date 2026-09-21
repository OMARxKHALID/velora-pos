import { useCallback } from "react"
import { toast } from "sonner"
import { useDemoStore } from "../store/demo-store-provider"

export const announceSynced = (count) => {
  if (count < 1) return
  toast.success(`${count} offline ${count === 1 ? "sale" : "sales"} synced`, { description: "Stock, reports and the dashboard are up to date." })
}

// One implementation for the header menu and the offline banner on the sell screen.
export const useSyncNow = () => {
  const setOffline = useDemoStore(({ setOffline }) => setOffline)
  const syncOutbox = useDemoStore(({ syncOutbox }) => syncOutbox)

  return useCallback(() => {
    setOffline(false)
    announceSynced(syncOutbox())
  }, [setOffline, syncOutbox])
}
