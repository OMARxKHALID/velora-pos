"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useStore } from "zustand"
import { signOut } from "@/features/auth/actions"
import { adjustStockAction, receiveDeliveryAction } from "@/features/inventory/actions"
import { deleteProductAction, importCatalogAction, saveProductAction, setProductStatusAction } from "@/features/catalog/actions"
import { resetDemoTeamAction } from "@/features/demo/actions"
import { closeShiftAction, discardHeldCartAction, holdCartAction, openShiftAction, recordSaleAction, takeHeldCartAction } from "@/features/pos/actions"
import { decideRefundAction, requestRefundAction } from "@/features/refunds/actions"
import { updateSettingsAction } from "@/features/settings/actions"
import { createLedgerStore } from "./ledger-store"

const REFRESH_MS = 30_000

const actions = {
  recordSale: recordSaleAction,
  openShift: openShiftAction,
  closeShift: closeShiftAction,
  holdCart: holdCartAction,
  takeHeldCart: takeHeldCartAction,
  discardHeldCart: discardHeldCartAction,
  requestRefund: requestRefundAction,
  decideRefund: decideRefundAction,
  receiveDelivery: receiveDeliveryAction,
  adjustStock: adjustStockAction,
  saveProduct: saveProductAction,
  setProductStatus: setProductStatusAction,
  deleteProduct: deleteProductAction,
  importCatalog: importCatalogAction,
  updateSettings: updateSettingsAction,
  resetDemo: resetDemoTeamAction,
}

export const LedgerStoreContext = createContext(null)

export const LedgerStoreProvider = ({ directory, children }) => {
  const queryClient = useQueryClient()
  const [store] = useState(() => createLedgerStore({ directory, actions, onChanged: () => queryClient.invalidateQueries() }))

  useEffect(() => {
    store.getState().setDirectory(directory)
  }, [store, directory])

  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && store.getState().load()
    let signingOut = false
    const sessionEnded = store.subscribe(({ loadError }) => {
      if (signingOut || !loadError?.startsWith("Your session has ended")) return
      signingOut = true
      signOut()
    })
    const syncOnline = () => store.getState().setOffline(!navigator.onLine)
    refresh()
    syncOnline()
    const timer = setInterval(refresh, REFRESH_MS)
    window.addEventListener("focus", refresh)
    window.addEventListener("online", syncOnline)
    window.addEventListener("offline", syncOnline)
    return () => {
      clearInterval(timer)
      sessionEnded()
      window.removeEventListener("focus", refresh)
      window.removeEventListener("online", syncOnline)
      window.removeEventListener("offline", syncOnline)
    }
  }, [store])

  return <LedgerStoreContext.Provider value={store}>{children}</LedgerStoreContext.Provider>
}

export const useLedgerStore = (selector) => {
  const store = useContext(LedgerStoreContext)
  if (!store) throw new Error("useLedgerStore must be used inside LedgerStoreProvider")
  return useStore(store, selector)
}
