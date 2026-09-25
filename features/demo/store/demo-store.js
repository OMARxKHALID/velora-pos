import { createStore } from "zustand/vanilla"
import { createJSONStorage, persist } from "zustand/middleware"
import {
  applyAdjustment,
  applyCloseShift,
  applyDrawerOpen,
  applyExchange,
  applyOpenShift,
  applyPurchase,
  applyRefundDecision,
  applyRefundRequest,
  applySale,
  applyStockCount,
  applySync,
  emptyLedger,
} from "@/features/demo/lib/ledger"
import { createSeed } from "@/features/demo/lib/seed"
import { applyAddStaff, applyRemoveStaff, applySetLeave, applyTransferRole, applyUpdateProfile, canApprove, initialStaff } from "@/features/demo/lib/staff"
import { CART_STORAGE_KEY, STORAGE_KEY } from "@/features/demo/lib/storage"
import { applyDeleteCategory, applyDeleteProduct, applyImportCatalog, applySaveCategory, applySaveProduct, applySetProductStatus } from "@/features/catalog/lib/catalog-ledger"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"
import { applyDeleteShop, applyResetShopSettings, applySaveRegister, applySaveShop, applySetShopSettings, settingsFor } from "@/features/shops/lib/shops"

const ledgerKeys = Object.keys(emptyLedger())
const persistedKeys = [...ledgerKeys, "shopScope", "settings", "staff"]

const hasWindow = () => typeof window !== "undefined"

const safeLocalStorage = {
  getItem: (name) => (hasWindow() ? window.localStorage.getItem(name) : null),
  setItem: (name, value) => {
    if (!hasWindow()) return
    try {
      window.localStorage.setItem(name, value)
    } catch (error) {
      console.error("Could not save demo data to this browser", error)
    }
  },
  removeItem: (name) => hasWindow() && window.localStorage.removeItem(name),
}

const clearSavedCart = () => {
  try {
    window.sessionStorage.removeItem(CART_STORAGE_KEY)
  } catch {
    return false
  }
  return true
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
          epoch: 0,
          shopScope: "all",
          staff: initialStaff,
          settings: defaultPricingSettings(),
          recordSale: (input) => {
            if (input.approvedBy && !canApprove(get().staff, input.approvedBy)) throw new Error("The discount approver is not an active supervisor.")
            const { registers, shops, offline, sales } = get()
            const register = registers.find(({ id }) => id === input.registerId) ?? registers[0]
            const shop = shops.find(({ id }) => id === register?.shopId)
            const settings = settingsFor(get().settings, shops, register?.shopId)
            const sale = run(applySale)({
              settings,
              offline,
              shopId: register?.shopId,
              registerId: register?.id,
              registerCode: register?.code,
              fbrPosId: register?.fbrPosId || settings.fbrPosId,
              ntn: shop?.ntn || settings.ntn,
              strn: shop?.strn || settings.strn,
              ...input,
            })
            if (register?.drawerOnCash && get().sales.length > sales.length && sale.payments.some(({ method }) => method === "cash")) {
              run(applyDrawerOpen)({ registerId: register.id, shiftId: sale.shiftId, userId: sale.cashierId, reason: "sale" })
            }
            return sale
          },
          requestRefund: run(applyRefundRequest),
          decideRefund: (input) => {
            if (!canApprove(get().staff, input.userId)) throw new Error("Only a supervisor can decide a refund.")
            return run(applyRefundDecision)({ offline: get().offline, ...input })
          },
          openShift: run(applyOpenShift),
          closeShift: run(applyCloseShift),
          receivePurchase: run(applyPurchase),
          adjustStock: run(applyAdjustment),
          exchangeItem: (input) => run(applyExchange)({ offline: get().offline, ...input }),
          countStock: run(applyStockCount),
          syncOutbox: run(applySync),
          saveProduct: run(applySaveProduct),
          setProductStatus: run(applySetProductStatus),
          deleteProduct: run(applyDeleteProduct),
          importCatalog: run(applyImportCatalog),
          saveCategory: run(applySaveCategory),
          saveShop: run(applySaveShop),
          saveRegister: run(applySaveRegister),
          setShopSettings: run(applySetShopSettings),
          resetShopSettings: run(applyResetShopSettings),
          deleteShop: (input) => {
            const removed = run(applyDeleteShop)(input)
            if (get().shopScope === removed) set({ shopScope: "all" })
            return removed
          },
          openDrawer: run(applyDrawerOpen),
          deleteCategory: run(applyDeleteCategory),
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
          updateStaffProfile: (id, input) => set({ staff: applyUpdateProfile(get().staff, id, input) }),
          setStaffLeave: (id, leave) => set({ staff: applySetLeave(get().staff, id, leave) }),
          resetDemo: () => {
            clearSavedCart()
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
