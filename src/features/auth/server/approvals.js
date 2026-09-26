import "server-only"
import { COLLECTIONS as C } from "@/server/db/collections"
import { issueApproval } from "./approval-token"
import { createPinAttempts } from "./pin-attempts"
import { PIN_PATTERN, matchesPin } from "./pins"
import { blockedReason } from "@/features/staff/server/access"
import { UserError } from "@/shared/lib/errors"

export const approveDiscount = async ({ db, pinSecret, approvalSecret }, { cashierId, shopId = null, supervisorId, pin, discountPct, now = new Date() }) => {
  if (typeof supervisorId !== "string" || !supervisorId) throw new UserError("Choose a supervisor")
  if (typeof pin !== "string" || !PIN_PATTERN.test(pin)) throw new UserError("Enter the 4-digit supervisor PIN")
  if (!Number.isInteger(discountPct) || discountPct < 1 || discountPct > 90) throw new UserError("That discount cannot be approved")

  const attempts = createPinAttempts(db)
  if (await attempts.blocked(supervisorId, now)) throw new UserError("Too many wrong PINs. Try again in a few minutes.")

  const supervisor = await db.collection(C.users).findOne({ _id: supervisorId }, { projection: { role: 1, banned: 1, removedAt: 1, pinHash: 1, shopIds: 1, leaveFrom: 1, leaveUntil: 1 } })
  if (!supervisor || supervisor.role !== "manager" || supervisor.banned || supervisor.removedAt) throw new UserError("Choose an active supervisor")
  if (shopId && !supervisor.shopIds?.includes(shopId)) throw new UserError("Choose a supervisor from this shop")
  if (await blockedReason(db, supervisor, now)) throw new UserError("This supervisor is on leave or their shop is closed. Choose another.")
  if (!supervisor.pinHash) throw new UserError("This supervisor has no PIN yet. The owner can set one in Settings.")
  if (!(await attempts.claim(supervisorId, now))) throw new UserError("Too many wrong PINs. Try again in a few minutes.")
  if (!matchesPin(pinSecret, supervisor.pinHash, supervisorId, pin)) throw new UserError("Wrong PIN")

  await attempts.clear(supervisorId)
  return { approvedBy: supervisorId, approvalToken: issueApproval(approvalSecret, { cashierId, supervisorId, discountPct, now: now.getTime() }) }
}
