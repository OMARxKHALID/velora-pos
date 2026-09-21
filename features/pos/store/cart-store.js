import { createStore } from "zustand/vanilla"
import { createJSONStorage, persist } from "zustand/middleware"
import { CART_STORAGE_KEY } from "@/features/demo/lib/storage"
import { newId } from "@/lib/id"
import { fitToStock } from "../lib/cart-fit"

const blank = { lines: [], discountPct: 0, approvedBy: null, customerName: "", customerPhone: "" }

const currentCart = ({ lines, discountPct, approvedBy, customerName, customerPhone }) => ({ lines, discountPct, approvedBy, customerName, customerPhone })

const holdOf = (cart, label, position) => ({
  id: newId(),
  ...currentCart(cart),
  parkedAt: Date.now(),
  label: label || cart.customerName || `Order #${position}`,
})

// The cart lives in this browser tab, so a refresh (or a dropped connection) does not lose the sale in progress.
export const createCartStore = () =>
  createStore()(
    persist(
      (set, get) => ({
        ...blank,
        parkedSales: [],
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
        setDiscount: (discountPct, approvedBy = null) => set({ discountPct, approvedBy }),
        setCustomer: ({ name, phone }) =>
          set((state) => ({
            customerName: name !== undefined ? name : state.customerName,
            customerPhone: phone !== undefined ? phone : state.customerPhone,
          })),
        parkSale: (label = "") => {
          const state = get()
          if (!state.lines.length) return null
          const parked = holdOf(state, label.trim(), state.parkedSales.length + 1)
          set({ ...blank, parkedSales: [parked, ...state.parkedSales] })
          return parked
        },
        // Returns which lines had to be trimmed (or null if the held cart does not exist).
        resumeSale: (parkedId, stock = null) => {
          const state = get()
          const parked = state.parkedSales.find(({ id }) => id === parkedId)
          if (!parked) return null
          const rest = state.parkedSales.filter(({ id }) => id !== parkedId)
          const parkedSales = state.lines.length ? [holdOf(state, "", rest.length + 1), ...rest] : rest
          const { lines, adjusted } = stock ? fitToStock(parked.lines, stock) : { lines: parked.lines, adjusted: [] }
          set({ ...currentCart(parked), lines, parkedSales })
          return { adjusted }
        },
        removeParkedSale: (parkedId) => set((state) => ({ parkedSales: state.parkedSales.filter(({ id }) => id !== parkedId) })),
        // Drops items that no longer exist in the catalog (for example after demo data was reset).
        prune: (variantIds) =>
          set(({ lines, parkedSales }) => ({
            lines: lines.filter(({ variantId }) => variantIds.has(variantId)),
            parkedSales: parkedSales
              .map((parked) => ({ ...parked, lines: parked.lines.filter(({ variantId }) => variantIds.has(variantId)) }))
              .filter(({ lines: kept }) => kept.length),
          })),
        clear: () => set(blank),
      }),
      {
        name: CART_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => sessionStorage),
        partialize: (state) => ({ ...currentCart(state), parkedSales: state.parkedSales }),
      }
    )
  )
