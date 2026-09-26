import { z } from "zod"
import { NTN_PATTERN, POSID_PATTERN, STRN_PATTERN } from "@/features/fbr/lib/fbr"
import { changesBetween, writeAudit } from "@/server/db/audit"
import { caseInsensitive } from "@/server/db/indexes"
import { COLLECTIONS as C } from "@/server/db/collections"
import { isDuplicateKey, withTransaction } from "@/server/db/transaction"
import { UserError, parseInput } from "@/shared/lib/errors"
import { newId } from "@/shared/lib/id"

const PHONE_PATTERN = /^[\d\s+()-]{7,20}$/
const SHOP_AUDITED = ["name", "address", "city", "phone", "ntn", "strn", "active"]
const REGISTER_AUDITED = ["name", "fbrPosId", "autoPrint", "copies", "drawerOnCash", "manualDrawer"]

const text = (max) => z.string().trim().max(max).default("")

const shopSchema = z.object({
  shopId: z.string({ error: "New shops cannot be added yet" }).min(1).max(64),
  name: z.string().trim().min(1, { error: "Enter the shop name" }).max(40),
  address: text(160),
  city: text(40),
  phone: text(20).refine((value) => !value || PHONE_PATTERN.test(value), { error: "That phone number does not look right" }),
  ntn: text(9).refine((value) => !value || NTN_PATTERN.test(value), { error: "NTN must be 8 digits, like 1234567-8" }),
  strn: text(13).refine((value) => !value || STRN_PATTERN.test(value), { error: "STRN must be 13 digits" }),
  active: z.boolean().default(true),
})

const registerSchema = z.object({
  registerId: z.string().min(1).max(64).nullish(),
  shopId: z.string().min(1).max(64),
  name: text(30),
  fbrPosId: text(6).refine((value) => !value || POSID_PATTERN.test(value), { error: "POSID must be 6 digits" }),
  autoPrint: z.boolean().optional(),
  copies: z.number().int().refine((value) => [1, 2].includes(value), { error: "Print one or two copies" }).optional(),
  drawerOnCash: z.boolean().optional(),
  manualDrawer: z.boolean().optional(),
})

const nextCode = (codes, prefix) => {
  let number = 1
  while (codes.includes(`${prefix}${number}`)) number += 1
  return `${prefix}${number}`
}

const toShop = ({ _id, ...rest }) => ({ id: _id, ...rest })

export const saveShop = async ({ db, client, user, at = new Date() }, input) => {
  const request = parseInput(shopSchema, input)
  const name = request.name.replace(/\s+/g, " ")
  return withTransaction(client, async (session) => {
    const shops = db.collection(C.shops)
    const existing = await shops.findOne({ _id: request.shopId }, { session })
    if (!existing) throw new UserError("Shop not found")
    if (await shops.findOne({ name, _id: { $ne: request.shopId } }, { session, collation: caseInsensitive })) throw new UserError(`${name} already exists`)
    if (!request.active && (await db.collection(C.shifts).findOne({ shopId: existing._id, status: "open" }, { session }))) throw new UserError("Close the open shift in this shop first")

    const details = { name, address: request.address, city: request.city, phone: request.phone, ntn: request.ntn, strn: request.strn, active: request.active }
    const record = { ...existing, ...details, updatedAt: at }
    await shops.replaceOne({ _id: existing._id }, record, { session })
    const changes = changesBetween(existing, record, SHOP_AUDITED)
    if (Object.keys(changes).length) await writeAudit(db, session, { shopId: existing._id, userId: user.id, kind: "shop.update", target: existing._id, changes, at })
    return toShop(record)
  })
}

export const saveRegister = async ({ db, client, user, at = new Date() }, input) => {
  const request = parseInput(registerSchema, input)
  try {
    return await withTransaction(client, async (session) => {
      const registers = db.collection(C.registers)
      const existing = request.registerId ? await registers.findOne({ _id: request.registerId }, { session }) : null
      if (request.registerId && !existing) throw new UserError("Counter not found")
      const shop = await db.collection(C.shops).findOne({ _id: existing?.shopId ?? request.shopId }, { session })
      if (!shop) throw new UserError("Shop not found")
      if (request.fbrPosId && (await registers.findOne({ fbrPosId: request.fbrPosId, _id: { $ne: request.registerId ?? "" } }, { session }))) throw new UserError("Another counter already uses that POSID")

      const settings = {
        name: request.name.replace(/\s+/g, " ") || existing?.name || "Counter",
        fbrPosId: request.fbrPosId,
        autoPrint: request.autoPrint ?? existing?.autoPrint ?? false,
        copies: request.copies ?? existing?.copies ?? 1,
        drawerOnCash: request.drawerOnCash ?? existing?.drawerOnCash ?? true,
        manualDrawer: request.manualDrawer ?? existing?.manualDrawer ?? true,
      }
      if (existing) {
        const record = { ...existing, ...settings }
        await registers.replaceOne({ _id: existing._id }, record, { session })
        const changes = changesBetween(existing, record, REGISTER_AUDITED)
        if (Object.keys(changes).length) await writeAudit(db, session, { shopId: shop._id, userId: user.id, kind: "register.update", target: existing._id, changes, at })
        return toShop(record)
      }
      const codes = (await registers.find({ shopId: shop._id }, { session, projection: { code: 1 } }).toArray()).map((register) => register.code)
      const record = { _id: `reg-${newId().slice(0, 8)}`, shopId: shop._id, code: nextCode(codes, `${shop.code}-R`), ...settings, lastReceiptSeq: 0, lastOfflineSeq: 0, lastFbrSeq: 0 }
      await registers.insertOne(record, { session })
      await writeAudit(db, session, { shopId: shop._id, userId: user.id, kind: "register.create", target: record._id, at })
      return toShop(record)
    })
  } catch (error) {
    if (isDuplicateKey(error)) throw new UserError("Another counter already has that code. Try again.")
    throw error
  }
}

export const deleteShop = async ({ db, client, user, at = new Date() }, { shopId }) =>
  withTransaction(client, async (session) => {
    const shop = await db.collection(C.shops).findOne({ _id: shopId }, { session })
    if (!shop) throw new UserError("Shop not found")
    if ((await db.collection(C.shops).countDocuments({}, { session })) <= 1) throw new UserError("The last shop cannot be deleted")
    const staff = await db.collection(C.users).countDocuments({ shopIds: shopId, removedAt: { $exists: false } }, { session })
    if (staff) throw new UserError(`Move its ${staff} staff to another shop first`)
    const has = await Promise.all([C.products, C.sales, C.shifts, C.movements].map((name) => db.collection(name).findOne({ shopId }, { session, projection: { _id: 1 } })))
    if (has.some(Boolean)) throw new UserError("This shop has products or history. Close it instead, so old receipts and reports stay correct.")
    await db.collection(C.registers).deleteMany({ shopId }, { session })
    await db.collection(C.settings).deleteOne({ _id: shopId }, { session })
    await db.collection(C.categories).deleteMany({ shopId }, { session })
    await db.collection(C.shops).deleteOne({ _id: shopId }, { session })
    await writeAudit(db, session, { shopId, userId: user.id, kind: "shop.delete", target: shopId, changes: { name: { from: shop.name, to: null } }, at })
    return { id: shopId }
  })
