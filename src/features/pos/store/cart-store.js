import { createStore } from "zustand/vanilla"
import { createJSONStorage, persist } from "zustand/middleware"
const CART_STORAGE_KEY = "velora-cart"

const blank = { lines: [], discountPct: 0, approvedBy: null, approvalToken: null, customerName: "", customerPhone: "" }

const currentCart = ({ lines, discountPct, approvedBy, approvalToken, customerName, customerPhone }) => ({ lines, discountPct, approvedBy, approvalToken, customerName, customerPhone })

const withoutApproval = { discountPct: 0, approvedBy: null, approvalToken: null }

export const createCartStore = () =>
  createStore()(
    persist(
      (set, get) => ({
        ...blank,
        add: (variantId, entry = "scan") => {
          const dropped = Boolean(get().approvedBy)
          set(({ lines }) => ({
            lines: lines.some((line) => line.variantId === variantId)
              ? lines.map((line) => (line.variantId === variantId ? { ...line, quantity: line.quantity + 1 } : line))
              : [...lines, { variantId, quantity: 1, entry }],
            ...(dropped && withoutApproval),
          }))
          return dropped
        },
        setQuantity: (variantId, quantity) => {
          const current = get().lines.find((line) => line.variantId === variantId)?.quantity ?? 0
          const dropped = Boolean(get().approvedBy) && quantity > current
          set(({ lines }) => ({
            lines:
              quantity < 1
                ? lines.filter((line) => line.variantId !== variantId)
                : lines.map((line) => (line.variantId === variantId ? { ...line, quantity } : line)),
            ...(dropped && withoutApproval),
          }))
          return dropped
        },
        removeLine: (variantId) => {
          const index = get().lines.findIndex((line) => line.variantId === variantId)
          if (index < 0) return null
          const line = get().lines[index]
          set(({ lines }) => ({ lines: lines.filter((entry) => entry.variantId !== variantId) }))
          return { line, index }
        },
        putBack: ({ line, index }) =>
          set(({ lines }) => (lines.some((entry) => entry.variantId === line.variantId) ? {} : { lines: lines.toSpliced(index, 0, line) })),
        setDiscount: (discountPct, approvedBy = null, approvalToken = null) => set({ discountPct, approvedBy, approvalToken }),
        setCustomer: ({ name, phone }) =>
          set((state) => ({
            customerName: name !== undefined ? name : state.customerName,
            customerPhone: phone !== undefined ? phone : state.customerPhone,
          })),
        load: (cart) => set({ ...blank, ...currentCart({ ...blank, ...cart }) }),
        prune: (variantIds) => set(({ lines }) => ({ lines: lines.filter(({ variantId }) => variantIds.has(variantId)) })),
        clear: () => {
          const removed = currentCart(get())
          set(blank)
          return removed
        },
        restore: (removed) => {
          if (get().lines.length) return false
          set(removed)
          return true
        },
      }),
      {
        name: CART_STORAGE_KEY,
        version: 3,
        migrate: () => ({}),
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => currentCart(state),
      }
    )
  )
