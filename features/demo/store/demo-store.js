import { createStore } from "zustand/vanilla"
import { createJSONStorage, persist } from "zustand/middleware"
import {
  applyAdjustment,
  applyCloseShift,
  applyOpenShift,
  applyPurchase,
  applyRefundDecision,
  applyRefundRequest,
  applySale,
  applySync,
  emptyLedger,
} from "@/features/demo/lib/ledger"
import { createSeed } from "@/features/demo/lib/seed"
import { migrateDemoState } from "@/features/demo/lib/migrate"
import { applyAddStaff, applyRemoveStaff, applyTransferRole, canApprove, canSell, initialStaff } from "@/features/demo/lib/staff"
import { CART_STORAGE_KEY, SAVE_FAILED_EVENT, STORAGE_KEY } from "@/features/demo/lib/storage"
import { applyDeleteProduct, applyImportCatalog, applySaveProduct, applySetProductStatus } from "@/features/catalog/lib/catalog-ledger"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"
import { adoptHeldCarts, applyHoldCart, applyTakeHeldCart } from "@/features/pos/lib/held-carts"

const ledgerKeys = Object.keys(emptyLedger())
const persistedKeys = [...ledgerKeys, "shopScope", "settings", "staff", "heldCarts"]

const hasWindow = () => typeof window !== "undefined"

const browserStorage = () => {
  let lastSeen = null

  const read = (name) => {
    if (!hasWindow()) return null
    try {
      return window.localStorage.getItem(name)
    } catch {
      return null
    }
  }

  return {
    getItem: (name) => {
      lastSeen = read(name)
      return lastSeen
    },
    setItem: (name, value) => {
      if (!hasWindow()) return
      try {
        window.localStorage.setItem(name, value)
        lastSeen = value
      } catch (error) {
        window.dispatchEvent(new CustomEvent(SAVE_FAILED_EVENT, { detail: error }))
      }
    },
    removeItem: (name) => {
      try {
        window.localStorage.removeItem(name)
      } catch {}
    },
    changedElsewhere: (name) => hasWindow() && read(name) !== lastSeen,
  }
}

export const createDemoStore = () => {
  const storage = browserStorage()

  return createStore()(
    persist(
      (set, get, api) => {
        const latest = () => {
          if (get().hydrated && storage.changedElsewhere(STORAGE_KEY)) api.persist.rehydrate()
          return get()
        }

        const run = (reducer) => (input) => {
          const current = latest()
          const { state, record } = reducer(current, { at: Date.now(), offline: current.offline, ...input })
          set(Object.fromEntries(ledgerKeys.map((key) => [key, state[key]])))
          return record
        }

        return {
          ...emptyLedger(),
          hydrated: false,
          offline: false,
          epoch: 0,
          shopScope: "all",
          staff: initialStaff,
          settings: defaultPricingSettings(),
          heldCarts: [],
          holdCart: (input) => {
            const { heldCarts, record } = applyHoldCart(latest().heldCarts, { at: Date.now(), ...input })
            set({ heldCarts })
            return record
          },
          takeHeldCart: (id) => {
            const { heldCarts, record } = applyTakeHeldCart(latest().heldCarts, id)
            set({ heldCarts })
            return record
          },
          discardHeldCart: (id) => set({ heldCarts: latest().heldCarts.filter((held) => held.id !== id) }),
          adoptHeldCarts: (carts) => set({ heldCarts: adoptHeldCarts(latest().heldCarts, carts) }),
          recordSale: (input) => {
            const { staff, settings, offline } = latest()
            if (!canSell(staff, input.cashierId)) throw new Error("Only an active cashier can sell.")
            if (input.approvedBy && !canApprove(staff, input.approvedBy)) throw new Error("The discount approver is not an active supervisor.")
            return run(applySale)({ settings, offline, ...input })
          },
          requestRefund: run(applyRefundRequest),
          decideRefund: (input) => {
            if (!canApprove(latest().staff, input.userId)) throw new Error("Only a supervisor can decide a refund.")
            return run(applyRefundDecision)(input)
          },
          openShift: run(applyOpenShift),
          closeShift: run(applyCloseShift),
          receivePurchase: run(applyPurchase),
          adjustStock: run(applyAdjustment),
          syncOutbox: run(applySync),
          saveProduct: run(applySaveProduct),
          setProductStatus: run(applySetProductStatus),
          deleteProduct: run(applyDeleteProduct),
          importCatalog: run(applyImportCatalog),
          setOffline: (offline) => set({ offline }),
          setShopScope: (shopScope) => set({ shopScope }),
          setSettings: (patch) => set({ settings: { ...latest().settings, ...patch } }),
          addStaff: (input) => {
            const { staff, member } = applyAddStaff(latest().staff, input)
            set({ staff })
            return member
          },
          transferStaffRole: (id, role) => set({ staff: applyTransferRole(latest().staff, id, role) }),
          removeStaff: (id) => set({ staff: applyRemoveStaff(latest().staff, id) }),
          resetDemo: () => {
            try {
              window.sessionStorage.removeItem(CART_STORAGE_KEY)
            } catch {}
            set({
              ...createSeed(),
              offline: false,
              shopScope: "all",
              settings: defaultPricingSettings(),
              staff: initialStaff,
              heldCarts: [],
              epoch: get().epoch + 1,
            })
          },
        }
      },
      {
        name: STORAGE_KEY,
        version: 8,
        migrate: migrateDemoState,
        skipHydration: true,
        storage: createJSONStorage(() => storage),
        partialize: (state) => Object.fromEntries(persistedKeys.map((key) => [key, state[key]])),
      }
    )
  )
}
