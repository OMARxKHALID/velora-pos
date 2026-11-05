import "server-only"
import { COLLECTIONS as C } from "@/server/db/collections"
import { writeAudit } from "@/server/db/audit"
import { issueApproval, readApproval } from "./approval-token"
import { createPinAttempts } from "./pin-attempts"
import { PIN_PATTERN, matchesPin } from "./pins"
import { blockedReason } from "@/features/staff/server/access"
import { UserError } from "@/shared/lib/errors"

const TOO_MANY = "Too many wrong PINs. Try again in a few minutes."
const LOCKED_TODAY = "This supervisor's PIN is locked after too many wrong tries today. The owner can set a new PIN in Settings."

const approve = async ({ db, pinSecret, approvalSecret }, { kind, scope, cashierId, shopId = null, supervisorId, pin, now = new Date() }) => {
  if (typeof supervisorId !== "string" || !supervisorId) throw new UserError("Choose a supervisor")
  if (typeof pin !== "string" || !PIN_PATTERN.test(pin)) throw new UserError("Enter the 4-digit supervisor PIN")

  const attempts = createPinAttempts(db)
  if (await attempts.lockedForDay(supervisorId, now)) throw new UserError(LOCKED_TODAY)
  if (await attempts.blocked(supervisorId, now)) throw new UserError(TOO_MANY)

  const supervisor = await db.collection(C.users).findOne({ _id: supervisorId }, { projection: { role: 1, banned: 1, removedAt: 1, pinHash: 1, shopIds: 1, leaveFrom: 1, leaveUntil: 1 } })
  if (!supervisor || supervisor.role !== "manager" || supervisor.banned || supervisor.removedAt) throw new UserError("Choose an active supervisor")
  if (shopId && !supervisor.shopIds?.includes(shopId)) throw new UserError("Choose a supervisor from this shop")
  if (await blockedReason(db, supervisor, now)) throw new UserError("This supervisor is on leave or their shop is closed. Choose another.")
  if (!supervisor.pinHash) throw new UserError("This supervisor has no PIN yet. The owner can set one in Settings.")

  const claim = await attempts.claim(supervisorId, now)
  if (!claim) throw new UserError(TOO_MANY)
  if (!matchesPin(pinSecret, supervisor.pinHash, supervisorId, pin)) {
    if (await attempts.lockedForDay(supervisorId, now)) {
      await writeAudit(db, undefined, { shopId, userId: cashierId, kind: "supervisor.pin_locked", target: supervisorId, at: now })
      throw new UserError(LOCKED_TODAY)
    }
    throw new UserError("Wrong PIN")
  }

  await attempts.release(claim)
  return { approvedBy: supervisorId, approvalToken: issueApproval(approvalSecret, { kind, cashierId, supervisorId, scope, now: now.getTime() }) }
}

export const approveDiscount = async (deps, { discountPct, subtotal, ...request }) => {
  if (!Number.isInteger(discountPct) || discountPct < 1 || discountPct > 90) throw new UserError("That discount cannot be approved")
  if (!Number.isInteger(subtotal) || subtotal < 1) throw new UserError("Add items to the cart before asking for a discount")
  return approve(deps, { ...request, kind: "discount", scope: { pct: discountPct, subtotal } })
}

export const approveDiscard = async (deps, { clientId, ...request }) => {
  if (typeof clientId !== "string" || clientId.length < 8 || clientId.length > 64) throw new UserError("That sale cannot be removed")
  return approve(deps, { ...request, kind: "discard", scope: { clientId } })
}

export const consumeApproval = async (db, session, { approvalSecret, kind, cashierId, token, at, matches }) => {
  const approval = readApproval(approvalSecret, token, { kind, cashierId, now: at.getTime() })
  if (!approval || !matches(approval.scope)) return null
  const supervisor = await db.collection(C.users).findOne({ _id: approval.supervisorId }, { session, projection: { role: 1, banned: 1, removedAt: 1 } })
  if (!supervisor || supervisor.role !== "manager" || supervisor.banned || supervisor.removedAt) throw new UserError("The approving supervisor is no longer active. Ask another supervisor.")
  const uses = db.collection(C.approvalUses)
  if (await uses.findOne({ _id: approval.id }, { session, projection: { _id: 1 } })) throw new UserError("This supervisor approval was already used. Ask for it again.")
  await uses.insertOne({ _id: approval.id, kind, supervisorId: approval.supervisorId, cashierId, usedAt: new Date() }, { session })
  return approval.supervisorId
}
