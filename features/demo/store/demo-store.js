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
  customerName: "",
  customerPhone: "",
  settings: defaultPricingSettings(),
  recordSale: (input) => run(applySale)({ settings: get().settings, offline: get().offline, customerName: get().customerName, customerPhone: get().customerPhone, ...input }),
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
          resetDemo: () => set({ ...createSeed(), offline: false, settings: get().settings }),
        }
      },
      {
        name: "velora-demo",
        version: 4,
        migrate: () => ({}),
        skipHydration: true,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => Object.fromEntries([...ledgerKeys, "offline", "shopScope", "settings", "customerName", "customerPhone"].map((key) => [key, state[key]])),
      }
    )
  )
