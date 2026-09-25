import "server-only"
import { COLLECTIONS as C, fromDoc } from "@/lib/db/collections"
import { listHeldCarts } from "./held-carts"
import { registerFor, shopSettings } from "./register"

export const posState = async (db, { shopId, registerId = null }) => {
  const register = await registerFor(db, undefined, shopId, registerId)
  const [shift, heldCarts, settings] = await Promise.all([
    db.collection(C.shifts).findOne({ registerId: register._id, status: "open" }),
    listHeldCarts(db, { shopId, registerId: register._id }),
    shopSettings(db, undefined, shopId),
  ])
  return { register: { id: register._id, code: register.code }, shift: shift ? fromDoc(shift) : null, heldCarts, settings }
}
