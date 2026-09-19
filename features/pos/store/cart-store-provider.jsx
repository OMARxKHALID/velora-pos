"use client"

import { createContext, useContext, useState } from "react"
import { useStore } from "zustand"
import { createCartStore } from "./cart-store"

const CartStoreContext = createContext(null)

export const CartStoreProvider = ({ children }) => {
  const [store] = useState(createCartStore)
  return <CartStoreContext.Provider value={store}>{children}</CartStoreContext.Provider>
}

export const useCartStore = (selector) => {
  const store = useContext(CartStoreContext)
  if (!store) throw new Error("useCartStore must be used inside CartStoreProvider")
  return useStore(store, selector)
}
