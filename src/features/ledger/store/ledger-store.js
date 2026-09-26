import { createStore } from "zustand/vanilla"
import { buildOfflineSale, overlayStock } from "@/features/offline/lib/offline-sale"
import { SessionEnded, countersFor, flushOutbox, outboxFor, queueOfflineSale, readSnapshot, retryEntry, removeEntry, saveSnapshot, sendOfflineSale } from "@/features/offline/lib/outbox"
import { TOP_UP_BELOW, numbersLeft } from "@/features/pos/lib/receipts"
import { defaultPricingSettings } from "@/features/pricing/lib/pricing"

const UNREACHABLE = "Could not reach the server. Check the connection and try again."

const LEDGER_TIMEOUT_MS = 30_000

const ACTION_TIMEOUTS = { recordSale: 15_000 }

const DATE_FIELDS = new Set(["soldAt", "syncedAt", "createdAt", "updatedAt", "decidedAt", "openedAt", "closedAt", "receivedAt", "parkedAt", "reportedAt", "at"])

export const parseLedger = (text) => JSON.parse(text, (key, value) => (DATE_FIELDS.has(key) && typeof value === "string" ? Date.parse(value) : value))

const unreachable = () => Object.assign(new Error(UNREACHABLE), { unreachable: true })

const isConnectionError = (error) => error instanceof TypeError || error?.name === "TimeoutError" || Boolean(error?.unreachable)

export const NOT_MODIFIED = Symbol("ledger-not-modified")

export const fetchLedger = async ({ etag = null, timeoutMs = LEDGER_TIMEOUT_MS } = {}) => {
  try {
    const response = await fetch("/api/ledger", { cache: "no-store", headers: etag ? { "If-None-Match": etag } : {}, signal: AbortSignal.timeout(timeoutMs) })
    if (response.status === 401) throw new SessionEnded("Your session has ended. Sign in again.")
    if (response.status === 304) return NOT_MODIFIED
    if (!response.ok) throw unreachable()
    return { ...parseLedger(await response.text()), etag: response.headers.get("etag") }
  } catch (error) {
    if (error instanceof SessionEnded) throw error
    throw unreachable()
  }
}

const withinTime = (pending, timeoutMs) => {
  if (!timeoutMs) return pending
  let timer
  const expired = new Promise((_, reject) => {
    timer = setTimeout(() => reject(unreachable()), timeoutMs)
  })
  return Promise.race([pending, expired]).finally(() => clearTimeout(timer))
}

const withLock = (name, work) => (typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request(name, work) : work())

export const createLedgerStore = ({ directory = {}, user = null, till = null, actions = {}, loadLedger = fetchLedger, sendSale = sendOfflineSale, onChanged = () => {}, timeouts = ACTION_TIMEOUTS } = {}) =>
  createStore()((set, get) => {
    const call = async (name, ...args) => {
      const result = await withinTime(actions[name](...args), timeouts[name]).catch(() => {
        set({ offline: true })
        throw unreachable()
      })
      if (result?.error) throw new Error(result.error)
      onChanged(name)
      return result?.record
    }

    const withStock = (patch) => ({ ...patch, stock: overlayStock(patch.serverStock ?? get().serverStock, patch.pending ?? get().pending) })

    let lastEtag = null

    const fromSnapshot = async () => {
      if (!till || !user || get().hydrated) return
      const saved = await readSnapshot(till, user.id).catch(() => null)
      if (!saved || get().hydrated) return
      const data = parseLedger(saved.text)
      lastEtag = data.etag ?? null
      set(withStock({ ...data, serverStock: data.stock, hydrated: true, savedAt: saved.savedAt }))
    }

    const onlineNow = () => ({ loadError: null, savedAt: null, offline: typeof navigator !== "undefined" && navigator.onLine === false })

    let loading = null
    const load = () => {
      loading ??= fromSnapshot()
        .then(() => loadLedger({ etag: lastEtag }))
        .then((data) => {
          if (data === NOT_MODIFIED) return set(onlineNow())
          lastEtag = data.etag ?? null
          set(withStock({ ...data, serverStock: data.stock, hydrated: true, ...onlineNow() }))
          if (till && user) saveSnapshot(till, user.id, JSON.stringify(data)).catch(() => {})
        })
        .catch(async (error) => {
          if (!(error instanceof SessionEnded)) {
            set({ offline: true })
            await fromSnapshot()
          }
          set({ loadError: error.message })
        })
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

    const recordOffline = async (input) => {
      if (!till || !user) throw unreachable()
      const { shift, sale, payload } = buildOfflineSale(get(), { cashierId: user.id, at: Date.now() }, input)
      const entry = await queueOfflineSale(till, { shift, cashierId: user.id, sale, payload })
      set(withStock({ pending: [...get().pending, entry], receiptsUsed: { ...get().receiptsUsed, [shift.id]: (get().receiptsUsed[shift.id] ?? 0) + 1 } }))
      return entry.sale
    }

    const refreshOutbox = async () => {
      if (!till || !user) return
      const pending = await outboxFor(till, user.id)
      set(withStock({ pending, receiptsUsed: { ...get().receiptsUsed, ...(await countersFor(till, [...new Set(pending.map(({ shiftId }) => shiftId))])) } }))
    }

    const myOpenShift = () => get().shifts.find(({ status, cashierId }) => status === "open" && cashierId === user?.id)

    const topUpReceipts = async () => {
      const shift = myOpenShift()
      if (!shift || !actions.reserveReceipts || get().offline) return
      const used = Math.max(get().receiptsUsed[shift.id] ?? 0, shift.offlineNext ?? 0)
      if (shift.receiptBlocks?.length && numbersLeft(shift.receiptBlocks, used) >= TOP_UP_BELOW) return
      await call("reserveReceipts", { shiftId: shift.id })
      await load()
    }

    let syncing = null
    const syncOutbox = () => {
      if (!till || user?.role !== "cashier") return Promise.resolve()
      syncing ??= (async () => {
        set({ syncing: true })
        try {
          const result = await withLock("velora-outbox", () => flushOutbox(till, { cashierId: user.id, send: sendSale }))
          if (result.uploaded || result.failed) {
            onChanged("syncOutbox")
            await load()
            await refreshOutbox()
          }
          await topUpReceipts()
        } catch (error) {
          if (error instanceof SessionEnded) set({ loadError: error.message })
          else if (isConnectionError(error)) set({ offline: true })
        } finally {
          set({ syncing: false })
          syncing = null
        }
      })()
      return syncing
    }

    return {
      shops: [],
      registers: [],
      products: [],
      variants: [],
      stock: {},
      shifts: [],
      refunds: [],
      exchanges: [],
      categories: [],
      usedVariantIds: [],
      heldCarts: [],
      settings: defaultPricingSettings(),
      staff: directory,
      hydrated: false,
      loadError: null,
      offline: false,
      savedAt: null,
      serverStock: {},
      pending: [],
      receiptsUsed: {},
      syncing: false,
      canSellOffline: Boolean(till && user?.role === "cashier"),
      shopScope: "all",
      epoch: 0,
      load,
      syncOutbox,
      setDirectory: (staff) => set({ staff }),
      setShopScope: (shopScope) => set({ shopScope }),
      setOffline: (offline) => set({ offline }),
      setOutbox: (pending, receiptsUsed) => set(withStock({ pending, receiptsUsed })),
      retryOffline: async (clientId) => {
        await retryEntry(till, clientId)
        await refreshOutbox()
        await syncOutbox()
      },
      removeOffline: async (clientId) => {
        await removeEntry(till, clientId)
        await refreshOutbox()
      },

      recordSale: async (input) => {
        if (!get().offline || !get().canSellOffline) {
          try {
            const record = await call("recordSale", input)
            load()
            return record
          } catch (error) {
            if (!error.unreachable || !get().canSellOffline) throw error
          }
        }
        return recordOffline(input)
      },
      openShift: mutate("openShift"),
      closeShift: mutate("closeShift"),
      requestRefund: mutate("requestRefund"),
      exchangeItem: mutate("exchangeItem"),
      decideRefund: mutate("decideRefund", ({ refundId, approve }) => [refundId, approve]),
      receivePurchase: mutate("receiveDelivery"),
      adjustStock: mutate("adjustStock"),
      countStock: mutate("countStock"),
      openDrawer: (input) => call("openDrawer", input),
      saveProduct: mutate("saveProduct"),
      setProductStatus: mutate("setProductStatus", ({ productId, status }) => [productId, status]),
      deleteProduct: mutate("deleteProduct", ({ productId }) => [productId]),
      importCatalog: mutate("importCatalog", ({ rows }) => [rows]),
      saveShop: mutate("saveShop"),
      saveRegister: mutate("saveRegister"),
      deleteShop: mutate("deleteShop", ({ shopId }) => [shopId]),
      saveCategory: mutate("saveCategory"),
      deleteCategory: mutate("deleteCategory", (categoryId) => [categoryId]),
      holdCart: mutate("holdCart"),
      takeHeldCart: mutate("takeHeldCart", (id) => [id]),
      discardHeldCart: mutate("discardHeldCart", (id) => [id]),
      setSettings: async (patch, scope = get().shopScope) => {
        const { shops, settings } = get()
        const touches = ({ id }) => scope === "all" || id === scope
        set({ settings: { ...settings, ...patch }, shops: shops.map((shop) => (touches(shop) ? { ...shop, settings: { ...shop.settings, ...patch } } : shop)) })
        try {
          await call("updateSettings", patch, scope)
          await load()
        } catch (error) {
          set({ settings, shops })
          throw error
        }
      },
      resetSampleData: async () => {
        await call("resetSampleData")
        await load()
        set({ epoch: get().epoch + 1 })
      },
    }
  })
