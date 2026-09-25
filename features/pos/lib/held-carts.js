import { REGISTER_ID } from "@/features/catalog/lib/catalog"

export const heldAt = (heldCarts, registerId = REGISTER_ID) => heldCarts.filter((held) => held.registerId === registerId)
