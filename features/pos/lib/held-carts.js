import { REGISTER_ID } from "@/features/catalog/lib/catalog"
import { newId } from "@/lib/id"

export const heldAt = (heldCarts, registerId = REGISTER_ID) => heldCarts.filter((held) => held.registerId === registerId)

export const applyHoldCart = (heldCarts, { cart, label = "", at, registerId = REGISTER_ID }) => {
  if (!cart.lines?.length) throw new Error("The cart is empty")
  const position = heldAt(heldCarts, registerId).length + 1
  const held = {
    id: newId(),
    registerId,
    lines: cart.lines,
    discountPct: cart.discountPct ?? 0,
    approvedBy: cart.approvedBy ?? null,
    customerName: cart.customerName ?? "",
    customerPhone: cart.customerPhone ?? "",
    parkedAt: at,
    label: label.trim() || cart.customerName?.trim() || `Order #${position}`,
  }
  return { heldCarts: [held, ...heldCarts], record: held }
}

export const applyTakeHeldCart = (heldCarts, id) => {
  const held = heldCarts.find((entry) => entry.id === id)
  if (!held) throw new Error("This sale was already resumed or discarded on another screen")
  return { heldCarts: heldCarts.filter((entry) => entry.id !== id), record: held }
}

export const adoptHeldCarts = (heldCarts, carts, registerId = REGISTER_ID) => {
  const known = new Set(heldCarts.map(({ id }) => id))
  const adopted = carts.filter(({ id, lines }) => id && !known.has(id) && lines?.length).map((cart) => ({ registerId, ...cart }))
  return [...adopted, ...heldCarts]
}
