import { createStore } from "zustand/vanilla"
import { emptyLedger } from "@/features/demo/lib/ledger"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"

const UNREACHABLE = "Could not reach the server. Check the connection and try again."

const DATE_FIELDS = new Set(["soldAt", "syncedAt", "createdAt", "updatedAt", "decidedAt", "openedAt", "closedAt", "receivedAt", "parkedAt", "at"])

export const parseLedger = (text) => JSON.parse(text, (key, value) => (DATE_FIELDS.has(key) && typeof value === "string" ? Date.parse(value) : value))

export const fetchLedger = async () => {
  const response = await fetch("/api/ledger", { cache: "no-store" })
  if (response.status === 401) throw new Error("Your session has ended. Sign in again.")
  if (!response.ok) throw new Error(UNREACHABLE)
  return parseLedger(await response.text())
}

export const createLedgerStore = ({ directory = {}, actions = {}, loadLedger = fetchLedger } = {}) =>
  createStore()((set, get) => {
    const call = async (name, ...args) => {
      const result = await actions[name](...args).catch(() => ({ error: UNREACHABLE }))
      if (result?.error) throw new Error(result.error)
      return result?.record
    }

    let loading = null
    const load = () => {
      loading ??= loadLedger()
        .then((data) => set({ ...data, hydrated: true, loadError: null }))
        .catch((error) => set({ loadError: error.message }))
        .finally(() => {
          loading = null
        })
      return loading
    }

    const mutate =
      (name, toArgs = (input) => [input]) =>
      async (...input) => {
        const record = await call(name, ...toArgs(...input))
        await load()
        return record
      }

    return {
      ...emptyLedger(),
      heldCarts: [],
      settings: defaultPricingSettings(),
      staff: directory,
      hydrated: false,
      loadError: null,
      offline: false,
      shopScope: "all",
      epoch: 0,
      load,
      setDirectory: (staff) => set({ staff }),
      setShopScope: (shopScope) => set({ shopScope }),
      setOffline: (offline) => set({ offline }),

      recordSale: async (input) => {
        const record = await call("recordSale", input)
        load()
        return record
      },
      openShift: mutate("openShift"),
      closeShift: mutate("closeShift"),
      requestRefund: mutate("requestRefund"),
      decideRefund: mutate("decideRefund", ({ refundId, approve }) => [refundId, approve]),
      receivePurchase: mutate("receiveDelivery"),
      adjustStock: mutate("adjustStock"),
      saveProduct: mutate("saveProduct"),
      setProductStatus: mutate("setProductStatus", ({ productId, status }) => [productId, status]),
      deleteProduct: mutate("deleteProduct", ({ productId }) => [productId]),
      importCatalog: mutate("importCatalog", ({ rows }) => [rows]),
      holdCart: mutate("holdCart"),
      takeHeldCart: mutate("takeHeldCart", (id) => [id]),
      discardHeldCart: mutate("discardHeldCart", (id) => [id]),
      setSettings: async (patch) => {
        const before = get().settings
        set({ settings: { ...before, ...patch } })
        try {
          set({ settings: await call("updateSettings", patch) })
        } catch (error) {
          set({ settings: before })
          throw error
        }
      },
      resetDemo: async () => {
        await call("resetDemo")
        await load()
        set({ epoch: get().epoch + 1 })
      },
    }
  })
