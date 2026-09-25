"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { liveQuery } from "dexie"
import { useStore } from "zustand"
import { signOut } from "@/features/auth/actions"
import { adjustStockAction, receiveDeliveryAction } from "@/features/inventory/actions"
import { deleteProductAction, importCatalogAction, saveProductAction, setProductStatusAction } from "@/features/catalog/actions"
import { resetSampleDataAction } from "@/features/sample-data/actions"
import { forgetDevice } from "@/features/offline/lib/forget-device"
import { outboxFor } from "@/features/offline/lib/outbox"
import { tillDb } from "@/features/offline/lib/till-db"
import { closeShiftAction, discardHeldCartAction, holdCartAction, openShiftAction, recordSaleAction, reserveReceiptsAction, takeHeldCartAction } from "@/features/pos/actions"
import { decideRefundAction, requestRefundAction } from "@/features/refunds/actions"
import { updateSettingsAction } from "@/features/settings/actions"
import { createLedgerStore } from "./ledger-store"

const REFRESH_MS = 30_000

const actions = {
  recordSale: recordSaleAction,
  openShift: openShiftAction,
  closeShift: closeShiftAction,
  reserveReceipts: reserveReceiptsAction,
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
  resetSampleData: resetSampleDataAction,
}

export const LedgerStoreContext = createContext(null)

const watchOutbox = (store, till, user) => {
  if (!till || user.role !== "cashier") return () => {}
  const subscription = liveQuery(async () => ({ pending: await outboxFor(till, user.id), counters: await till.counters.toArray() })).subscribe({
    next: ({ pending, counters }) => store.getState().setOutbox(pending, Object.fromEntries(counters.map(({ shiftId, used }) => [shiftId, used]))),
    error: () => {},
  })
  return () => subscription.unsubscribe()
}

export const LedgerStoreProvider = ({ user, directory, children }) => {
  const queryClient = useQueryClient()
  const [till] = useState(tillDb)
  const [store] = useState(() => createLedgerStore({ user, till, directory, actions, onChanged: () => queryClient.invalidateQueries() }))

  useEffect(() => {
    store.getState().setDirectory(directory)
  }, [store, directory])

  useEffect(() => watchOutbox(store, till, user), [store, till, user])

  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState !== "visible") return
      await store.getState().load()
      await store.getState().syncOutbox()
    }
    let signingOut = false
    const sessionEnded = store.subscribe(({ loadError }) => {
      if (signingOut || !loadError?.startsWith("Your session has ended")) return
      signingOut = true
      forgetDevice().finally(() => signOut())
    })
    const syncOnline = () => {
      store.getState().setOffline(!navigator.onLine)
      if (navigator.onLine) refresh()
    }
    refresh()
    store.getState().setOffline(!navigator.onLine)
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
