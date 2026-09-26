import { newId } from "@/shared/lib/id"
import { COLLECTIONS as C } from "./collections"

export const writeAudit = (db, session, { shopId, userId, kind, target, changes = null, at = new Date() }) =>
  db.collection(C.auditLog).insertOne({ _id: newId(), shopId, userId, kind, target, changes, at }, { session })

export const changesBetween = (before, after, fields) =>
  Object.fromEntries(
    fields
      .filter((field) => JSON.stringify(before?.[field] ?? null) !== JSON.stringify(after?.[field] ?? null))
      .map((field) => [field, { from: before?.[field] ?? null, to: after?.[field] ?? null }])
  )
