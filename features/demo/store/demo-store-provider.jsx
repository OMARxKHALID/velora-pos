"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useStore } from "zustand"
import { logout } from "@/features/auth/actions"
import { categoriesFromProducts } from "@/features/catalog/lib/catalog"
import { seedRegisters, seedShops } from "@/features/shops/lib/shops"
import { isOnLeave, worksAtClosedShop } from "../lib/staff"
import { STORAGE_KEY } from "../lib/storage"
import { createDemoStore } from "./demo-store"

export const DemoStoreContext = createContext(null)

const useSignOutIfGone = (store, user) => {
  const onTeam = useStore(
    store,
    ({ hydrated, staff, shops }) => !hydrated || (staff[user.id]?.role === user.role && !staff[user.id].removed && !isOnLeave(staff[user.id]) && !worksAtClosedShop(staff[user.id], shops))
  )
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
      const { categories, products, shops, registers, settings } = store.getState()
      if (!categories.length) store.setState({ categories: categoriesFromProducts(products) })
      if (!shops.length) {
        const [shop] = seedShops()
        store.setState({ shops: [{ ...shop, ntn: settings.ntn ?? "", strn: settings.strn ?? "", address: settings.receipt?.address ?? "", phone: settings.receipt?.phone ?? "" }] })
      }
      if (!registers.length) {
        const [register] = seedRegisters()
        store.setState({ registers: [{ ...register, fbrPosId: settings.fbrPosId ?? "" }] })
      }
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
