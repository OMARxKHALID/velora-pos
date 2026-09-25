import "server-only"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { UserError } from "@/lib/errors"

export const shopFor = async (db, user, requested) => {
  if (user.role !== "admin") return user.shopId
  const shopId = requested || (await db.collection(C.shops).findOne({}, { sort: { createdAt: 1, _id: 1 }, projection: { _id: 1 } }))?._id
  if (!shopId || !(await db.collection(C.shops).findOne({ _id: shopId }, { projection: { _id: 1 } }))) throw new UserError("Unknown shop")
  return shopId
}
