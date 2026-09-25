import { COLLECTIONS as C } from "@/lib/db/collections"
import { SHOP_TIME_ZONE, dayIn } from "@/lib/zoned"

const onLeave = ({ leaveFrom, leaveUntil }, today) => Boolean(leaveFrom) && leaveFrom <= today && (!leaveUntil || today <= leaveUntil)

export const blockedReason = async (db, person, now = new Date()) => {
  if (!person || person.role === "admin") return null
  if (onLeave(person, dayIn(SHOP_TIME_ZONE, now.getTime()))) return person.leaveUntil ? `You are on leave until ${person.leaveUntil}.` : "You are on leave."
  const shopId = person.shopIds?.[0]
  if (!shopId) return null
  const shop = await db.collection(C.shops).findOne({ _id: shopId }, { projection: { active: 1 } })
  return shop?.active === false ? "Your shop is closed." : null
}
