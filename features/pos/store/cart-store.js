import { createStore } from "zustand/vanilla"

const empty = { lines: [], discountPct: 0, approvedBy: null, customerName: "", customerPhone: "" }

export const createCartStore = () =>
  createStore()((set) => ({
    ...empty,
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
    clear: () => set(empty),
  }))
