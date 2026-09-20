import { createStore } from "zustand/vanilla"

const empty = { lines: [], discountPct: 0, approvedBy: null, customerName: "", customerPhone: "" }

export const createCartStore = () =>
  createStore()((set, get) => ({
    ...empty,
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
      const parked = {
        id: `park-${Date.now()}`,
        lines: state.lines,
        discountPct: state.discountPct,
        approvedBy: state.approvedBy,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        parkedAt: Date.now(),
        label: label || state.customerName || `Order #${state.parkedSales.length + 1}`,
      }
      set({ ...empty, parkedSales: [parked, ...state.parkedSales] })
      return parked
    },
    resumeSale: (parkedId) => {
      const state = get()
      const parked = state.parkedSales.find((p) => p.id === parkedId)
      if (!parked) return false
      let updatedParked = state.parkedSales.filter((p) => p.id !== parkedId)
      if (state.lines.length > 0) {
        const currentAsParked = {
          id: `park-${Date.now()}`,
          lines: state.lines,
          discountPct: state.discountPct,
          approvedBy: state.approvedBy,
          customerName: state.customerName,
          customerPhone: state.customerPhone,
          parkedAt: Date.now(),
          label: state.customerName || `Order #${updatedParked.length + 1}`,
        }
        updatedParked = [currentAsParked, ...updatedParked]
      }
      set({
        lines: parked.lines,
        discountPct: parked.discountPct,
        approvedBy: parked.approvedBy,
        customerName: parked.customerName,
        customerPhone: parked.customerPhone,
        parkedSales: updatedParked,
      })
      return true
    },
    removeParkedSale: (parkedId) =>
      set((state) => ({
        parkedSales: state.parkedSales.filter((p) => p.id !== parkedId),
      })),
    clear: () => set(empty),
  }))
