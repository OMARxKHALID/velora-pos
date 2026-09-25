"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { useStore } from "zustand"
import { logout } from "@/features/auth/actions"
import { SAVE_FAILED_EVENT, STORAGE_KEY } from "../lib/storage"
import { createDemoStore } from "./demo-store"

export const DemoStoreContext = createContext(null)

const useSignOutIfGone = (store, user) => {
  const onTeam = useStore(store, ({ hydrated, staff }) => !hydrated || (staff[user.id]?.role === user.role && !staff[user.id].removed))
  useEffect(() => {
    if (!onTeam) logout()
  }, [onTeam])
}

export const DemoStoreProvider = ({ user, children }) => {
  const [store] = useState(createDemoStore)
  useSignOutIfGone(store, user)

  useEffect(() => {
    const hydrate = async () => {
      await store.persist.rehydrate()
      if (!store.getState().sales.length) store.getState().resetDemo()
      store.setState({ hydrated: true })
    }
    hydrate()

    const handleStorage = (event) => event.key === STORAGE_KEY && event.newValue && store.persist.rehydrate()
    const handleSaveFailed = () =>
      toast.error("This browser could not save the last change", {
        id: SAVE_FAILED_EVENT,
        description: "Storage is full or blocked, so it will be lost on refresh. Reset the demo data to free space.",
        duration: Infinity,
      })
    window.addEventListener("storage", handleStorage)
    window.addEventListener(SAVE_FAILED_EVENT, handleSaveFailed)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(SAVE_FAILED_EVENT, handleSaveFailed)
    }
  }, [store])

  return <DemoStoreContext.Provider value={store}>{children}</DemoStoreContext.Provider>
}

export const useDemoStore = (selector) => {
  const store = useContext(DemoStoreContext)
  if (!store) throw new Error("useDemoStore must be used inside DemoStoreProvider")
  return useStore(store, selector)
}
