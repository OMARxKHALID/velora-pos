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
import { applyAddStaff, applyRemoveStaff, applyTransferRole, canApprove, initialStaff } from "@/features/demo/lib/staff"
import { CART_STORAGE_KEY, STORAGE_KEY } from "@/features/demo/lib/storage"
import { applyDeleteProduct, applyImportCatalog, applySaveProduct, applySetProductStatus } from "@/features/catalog/lib/catalog-ledger"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"

const ledgerKeys = Object.keys(emptyLedger())
const persistedKeys = [...ledgerKeys, "shopScope", "settings", "staff"]

// Saved on every change so another tab can pick it up straight away (see DemoStoreProvider).
const safeLocalStorage = {
  getItem: (name) => window.localStorage.getItem(name),
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value)
    } catch (error) {
      console.error("Could not save demo data to this browser", error)
    }
  },
  removeItem: (name) => window.localStorage.removeItem(name),
}

export const createDemoStore = () =>
  createStore()(
    persist(
      (set, get) => {
        const run = (reducer) => (input) => {
          const { state, record } = reducer(get(), { at: Date.now(), ...input })
          set(Object.fromEntries(ledgerKeys.map((key) => [key, state[key]])))
          return record
        }

        return {
          ...emptyLedger(),
          hydrated: false,
          offline: false,
          // Bumped by every reset so screens holding their own working state (the cart) start clean.
          epoch: 0,
          shopScope: "all",
          staff: initialStaff,
          settings: defaultPricingSettings(),
          recordSale: (input) => {
            if (input.approvedBy && !canApprove(get().staff, input.approvedBy)) throw new Error("The discount approver is not an active supervisor.")
            return run(applySale)({ settings: get().settings, offline: get().offline, ...input })
          },
          requestRefund: run(applyRefundRequest),
          decideRefund: (input) => {
            if (!canApprove(get().staff, input.userId)) throw new Error("Only a supervisor can decide a refund.")
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
          setSettings: (patch) => set(({ settings }) => ({ settings: { ...settings, ...patch } })),
          addStaff: (input) => {
            const { staff, member } = applyAddStaff(get().staff, input)
            set({ staff })
            return member
          },
          transferStaffRole: (id, role) => set({ staff: applyTransferRole(get().staff, id, role) }),
          removeStaff: (id) => set({ staff: applyRemoveStaff(get().staff, id) }),
          resetDemo: () => {
            try {
              window.sessionStorage.removeItem(CART_STORAGE_KEY)
            } catch {
              // Storage can be blocked; the cart then simply starts empty anyway.
            }
            set({
              ...createSeed(),
              offline: false,
              shopScope: "all",
              settings: defaultPricingSettings(),
              staff: initialStaff,
              epoch: get().epoch + 1,
            })
          },
        }
      },
      {
        name: STORAGE_KEY,
        version: 6,
        migrate: () => ({}),
        skipHydration: true,
        storage: createJSONStorage(() => safeLocalStorage),
        partialize: (state) => Object.fromEntries(persistedKeys.map((key) => [key, state[key]])),
      }
    )
  )
