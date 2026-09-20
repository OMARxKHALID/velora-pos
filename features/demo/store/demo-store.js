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
import { applyDeleteProduct, applyImportCatalog, applySaveProduct, applySetProductStatus } from "@/features/catalog/lib/catalog-ledger"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"
import { initialStaff } from "@/features/demo/lib/staff"

const ledgerKeys = Object.keys(emptyLedger())

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
          shopScope: "all",
          staff: initialStaff,
          settings: defaultPricingSettings(),
          recordSale: (input) => run(applySale)({ settings: get().settings, offline: get().offline, ...input }),
          requestRefund: run(applyRefundRequest),
          decideRefund: run(applyRefundDecision),
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
          transferStaffRole: (userId, newRole) => {
            if (userId === "u-admin" || newRole === "admin") throw new Error("Admin role cannot be transferred.")
            if (newRole !== "manager" && newRole !== "cashier") throw new Error("Roles can only be transferred between Supervisor and Cashier.")
            set(({ staff: currentStaff }) => {
              const user = currentStaff[userId]
              if (!user) throw new Error("User not found.")
              return { staff: { ...currentStaff, [userId]: { ...user, role: newRole } } }
            })
          },
          removeStaff: (userId) => {
            if (userId === "u-admin") throw new Error("Owner / Admin cannot be removed.")
            set(({ staff: currentStaff }) => {
              const next = { ...currentStaff }
              delete next[userId]
              return { staff: next }
            })
          },
          resetDemo: () => set({ ...createSeed(), offline: false, settings: get().settings, staff: initialStaff }),
        }
      },
      {
        name: "velora-demo",
        version: 5,
        migrate: () => ({}),
        skipHydration: true,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => Object.fromEntries([...ledgerKeys, "offline", "shopScope", "settings", "staff"].map((key) => [key, state[key]])),
      }
    )
  )
