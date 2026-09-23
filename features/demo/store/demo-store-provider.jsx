"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useStore } from "zustand"
import { logout } from "@/features/auth/actions"
import { STORAGE_KEY } from "../lib/storage"
import { createDemoStore } from "./demo-store"

export const DemoStoreContext = createContext(null)

// The server only knows the session cookie; the team list lives here. Anyone removed, or moved to another role, is signed out.
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
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [store])

  return <DemoStoreContext.Provider value={store}>{children}</DemoStoreContext.Provider>
}

export const useDemoStore = (selector) => {
  const store = useContext(DemoStoreContext)
  if (!store) throw new Error("useDemoStore must be used inside DemoStoreProvider")
  return useStore(store, selector)
}
