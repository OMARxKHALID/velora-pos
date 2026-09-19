"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useStore } from "zustand"
import { createDemoStore } from "./demo-store"

const DemoStoreContext = createContext(null)

export const DemoStoreProvider = ({ children }) => {
  const [store] = useState(createDemoStore)

  useEffect(() => {
    const hydrate = async () => {
      await store.persist.rehydrate()
      if (!store.getState().sales.length) store.getState().resetDemo()
      store.setState({ hydrated: true })
    }
    hydrate()
  }, [store])

  return <DemoStoreContext.Provider value={store}>{children}</DemoStoreContext.Provider>
}

export const useDemoStore = (selector) => {
  const store = useContext(DemoStoreContext)
  if (!store) throw new Error("useDemoStore must be used inside DemoStoreProvider")
  return useStore(store, selector)
}
