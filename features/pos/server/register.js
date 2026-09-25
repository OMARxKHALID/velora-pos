import { UserError } from "@/features/auth/server/session-errors"
import { COLLECTIONS as C } from "@/lib/db/collections"

export const registerFor = async (db, session, shopId, registerId = null) => {
  const register = await db.collection(C.registers).findOne(registerId ? { _id: registerId, shopId } : { shopId }, { sort: { _id: 1 }, session })
  if (!register) throw new UserError("This shop has no counter set up")
  return register
}

export const shopSettings = async (db, session, shopId) => {
  const settings = await db.collection(C.settings).findOne({ _id: shopId }, { session })
  if (!settings) throw new UserError("This shop has no settings yet")
  const { _id, shopId: _shop, ...rest } = settings
  return rest
}
