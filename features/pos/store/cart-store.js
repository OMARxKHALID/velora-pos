import { createStore } from "zustand/vanilla"
import { createJSONStorage, persist } from "zustand/middleware"
import { CART_STORAGE_KEY } from "@/features/demo/lib/storage"

const blank = { lines: [], discountPct: 0, approvedBy: null, approvalToken: null, customerName: "", customerPhone: "" }

export const currentCart = ({ lines, discountPct, approvedBy, approvalToken, customerName, customerPhone }) => ({ lines, discountPct, approvedBy, approvalToken, customerName, customerPhone })

export const createCartStore = () =>
  createStore()(
    persist(
      (set, get) => ({
        ...blank,
        legacyHeld: [],
        add: (variantId, entry = "scan") =>
          set(({ lines }) => ({
            lines: lines.some((line) => line.variantId === variantId)
              ? lines.map((line) => (line.variantId === variantId ? { ...line, quantity: line.quantity + 1 } : line))
              : [...lines, { variantId, quantity: 1, entry }],
          })),
        setQuantity: (variantId, quantity) =>
          set(({ lines }) => ({
            lines:
              quantity < 1
                ? lines.filter((line) => line.variantId !== variantId)
                : lines.map((line) => (line.variantId === variantId ? { ...line, quantity } : line)),
          })),
        setDiscount: (discountPct, approvedBy = null, approvalToken = null) => set({ discountPct, approvedBy, approvalToken }),
        setCustomer: ({ name, phone }) =>
          set((state) => ({
            customerName: name !== undefined ? name : state.customerName,
            customerPhone: phone !== undefined ? phone : state.customerPhone,
          })),
        load: (cart) => set({ ...blank, ...currentCart({ ...blank, ...cart }) }),
        takeLegacyHeld: () => {
          const { legacyHeld } = get()
          if (legacyHeld.length) set({ legacyHeld: [] })
          return legacyHeld
        },
        prune: (variantIds) => set(({ lines }) => ({ lines: lines.filter(({ variantId }) => variantIds.has(variantId)) })),
        clear: () => set(blank),
      }),
      {
        name: CART_STORAGE_KEY,
        version: 2,
        migrate: (saved, version) => (version === 1 && saved ? { ...currentCart({ ...blank, ...saved }), legacyHeld: saved.parkedSales ?? [] } : {}),
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({ ...currentCart(state), legacyHeld: state.legacyHeld }),
      }
    )
  )
