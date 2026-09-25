import { UserError } from "@/features/auth/server/session-errors"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { OFFLINE_BLOCK } from "../lib/receipts"

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

export const reserveOfflineBlock = async (db, session, registerId, size = OFFLINE_BLOCK) => {
  const { lastOfflineSeq } = await db.collection(C.registers).findOneAndUpdate({ _id: registerId }, { $inc: { lastOfflineSeq: size } }, { returnDocument: "after", session })
  return { from: lastOfflineSeq - size + 1, to: lastOfflineSeq }
}
