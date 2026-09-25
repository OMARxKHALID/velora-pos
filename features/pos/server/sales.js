import { z } from "zod"
import { readApproval } from "@/features/auth/server/approval-token"
import { UserError, parseInput } from "@/lib/errors"
import { MAX_CASHIER_DISCOUNT, PAYMENT_METHODS, applySale } from "@/features/ledger/lib/rules"
import { moveStock } from "@/features/inventory/server/stock"
import { cartTotals, effectiveRate } from "@/features/pricing/lib/pricing"
import { COLLECTIONS as C, fromDoc, toDoc } from "@/lib/db/collections"
import { isDuplicateKey, withTransaction } from "@/lib/db/transaction"
import { inBlocks, receiptNumber } from "../lib/receipts"
import { fbrSeqOf, registerFor, saveFbrSeq, shopSettings } from "./register"

const CLOCK_SLACK = 5 * 60 * 1000
const PRICE_HISTORY_SLACK = 24 * 60 * 60 * 1000
const TILL_SETTINGS = ["taxEnabled", "taxRate", "productDiscountEnabled", "cartDiscountEnabled", "pricesIncludeTax", "fbrServiceFee", "cashRounding"]

const lineSchema = z.object({
  variantId: z.string().min(1).max(80),
  quantity: z.number().int({ error: "Quantity must be a whole number" }).min(1, { error: "Quantity must be at least 1" }).max(99),
  entry: z.enum(["scan", "manual"]).default("scan"),
})

const saleSchema = z.object({
  clientId: z.string().min(8).max(64),
  shiftId: z.string().min(1).max(64),
  lines: z.array(lineSchema).min(1, { error: "Cart is empty" }).max(100, { error: "Split carts over 100 lines" }),
  discountPct: z.number().int().min(0).max(90).default(0),
  approvalToken: z.string().max(1000).nullish(),
  payments: z
    .array(z.object({ method: z.enum(PAYMENT_METHODS), amount: z.number().int().positive(), reference: z.string().trim().max(30).nullish() }))
    .min(1, { error: "Add a payment" })
    .max(4),
  customerName: z.string().trim().max(60).optional(),
  customerPhone: z.string().trim().max(30).optional(),
})

const offlineSaleSchema = saleSchema.extend({
  number: z.string().min(1).max(40),
  soldAt: z.number().int().positive(),
  total: z.number().int().min(0),
  lines: z
    .array(lineSchema.extend({ unitPrice: z.number().int().min(0), productDiscountPct: z.number().int().min(0).max(90).default(0) }))
    .min(1, { error: "Cart is empty" })
    .max(100),
  pricing: z.object({
    taxEnabled: z.boolean(),
    taxRate: z.number().min(0).max(100),
    taxLabel: z.string().max(40).nullish(),
    productDiscountEnabled: z.boolean(),
    cartDiscountEnabled: z.boolean(),
    pricesIncludeTax: z.boolean().optional(),
    fbrServiceFee: z.boolean().optional(),
    cashRounding: z.union([z.literal(1), z.literal(5), z.literal(10)]).optional(),
  }),
})

const approverFor = async (db, session, { approvalSecret, cashierId, discountPct, token, at }) => {
  if (!token) return null
  const approval = readApproval(approvalSecret, token, { cashierId, discountPct, now: at.getTime() })
  if (!approval) throw new UserError("The supervisor approval has expired or does not match this discount. Ask for it again.")
  const supervisor = await db.collection(C.users).findOne({ _id: approval.supervisorId }, { session, projection: { role: 1, banned: 1, removedAt: 1 } })
  if (!supervisor || supervisor.role !== "manager" || supervisor.banned || supervisor.removedAt) throw new UserError("The approving supervisor is no longer active. Ask another supervisor.")
  return approval.supervisorId
}

const merge = (lines) => Object.values(lines.reduce((all, line) => ({ ...all, [line.variantId]: all[line.variantId] ? { ...all[line.variantId], quantity: all[line.variantId].quantity + line.quantity } : line }), {}))

const loadCatalog = async (db, session, shopId, lines) => {
  const variants = await db.collection(C.variants).find({ _id: { $in: lines.map(({ variantId }) => variantId) }, shopId }, { session }).toArray()
  if (variants.length !== lines.length) throw new UserError("Unknown item")
  const products = await db.collection(C.products).find({ _id: { $in: [...new Set(variants.map(({ productId }) => productId))] }, shopId }, { session }).toArray()
  return { products: products.map(fromDoc), variants: variants.map(fromDoc) }
}

const indexOf = ({ products, variants }) => ({
  productById: Object.fromEntries(products.map((product) => [product.id, product])),
  variantById: Object.fromEntries(variants.map((variant) => [variant.id, variant])),
})

const categoriesOf = async (db, session, shopId) => (await db.collection(C.categories).find({ shopId }, { session }).toArray()).map(fromDoc)

const buildSale = async (db, session, { user, shift, register, shop, catalog, settings, lines, input, at, approvalSecret, number }) => {
  const { rows, subtotal } = cartTotals(lines, input.discountPct, indexOf(catalog), settings)
  const cartDiscount = rows.reduce((sum, { discount }) => sum + discount, 0)
  const needsApproval = cartDiscount > subtotal * MAX_CASHIER_DISCOUNT
  const approvedBy = needsApproval ? await approverFor(db, session, { approvalSecret, cashierId: user.id, discountPct: input.discountPct, token: input.approvalToken, at }) : null
  const categories = await categoriesOf(db, session, shift.shopId)
  try {
    const { record, state } = applySale(
      { ...catalog, categories, sales: [], stock: {}, movements: [], shifts: [{ ...fromDoc(shift), status: "open" }], receiptSeq: register.lastReceiptSeq, fbrSeq: fbrSeqOf(register) },
      {
        lines: rows.map(({ variantId, quantity, discount, productDiscount, entry }) => ({ variantId, quantity, discount, productDiscount, entry })),
        payments: input.payments,
        cashierId: user.id,
        shiftId: shift._id,
        at,
        clientId: input.clientId,
        approvedBy,
        settings,
        customerName: settings.customerInfoEnabled ? input.customerName : undefined,
        customerPhone: settings.customerInfoEnabled ? input.customerPhone : undefined,
        shopId: shift.shopId,
        registerId: register._id,
        registerCode: register.code,
        number,
        fbrPosId: register.fbrPosId ?? null,
        ntn: shop.ntn ?? null,
        strn: shop.strn ?? null,
      }
    )
    if (record.fbr) await saveFbrSeq(db, session, register._id, state.fbrSeq)
    return record
  } catch (error) {
    throw new UserError(error.message)
  }
}

const nextReceiptNumber = async (db, session, register) => {
  const { lastReceiptSeq } = await db.collection(C.registers).findOneAndUpdate({ _id: register._id }, { $inc: { lastReceiptSeq: 1 } }, { returnDocument: "after", session })
  return receiptNumber(register.code, lastReceiptSeq)
}

const takeStock = async (db, session, { sale, number, user, at, allowNegative }) => {
  let negative = false
  for (const item of sale.items) {
    try {
      const movement = await moveStock(db, session, {
        shopId: sale.shopId,
        variantId: item.variantId,
        quantity: -item.quantity,
        type: "sale",
        unitCost: item.unitCost,
        ref: { kind: "Sale", id: sale.id, number },
        userId: user.id,
        at,
        allowNegative,
      })
      negative ||= movement.balanceAfter < 0
    } catch (error) {
      if (error.message !== "Not enough stock") throw error
      const left = (await db.collection(C.stock).findOne({ shopId: sale.shopId, variantId: item.variantId }, { session }))?.quantity ?? 0
      throw new UserError(`Only ${Math.max(left, 0)} left of ${item.productName} (${item.attributes.color} · EU ${item.attributes.size})`)
    }
  }
  return negative
}

const existingSale = (db, session, clientId) => db.collection(C.sales).findOne({ clientId }, { session })

const recordInSession = async (db, session, { user, shopId, at, approvalSecret }, input) => {
  const existing = await existingSale(db, session, input.clientId)
  if (existing) return fromDoc(existing)

  const shift = await db.collection(C.shifts).findOne({ _id: input.shiftId, shopId }, { session })
  if (!shift || shift.status !== "open") throw new UserError("Open a shift before selling")
  const register = await registerFor(db, session, shopId, shift.registerId)
  const settings = await shopSettings(db, session, shopId)
  const lines = merge(input.lines)
  const catalog = await loadCatalog(db, session, shopId, lines)

  const shop = await db.collection(C.shops).findOne({ _id: shopId }, { session })
  const number = await nextReceiptNumber(db, session, register)
  const sale = await buildSale(db, session, { user, shift, register, shop, catalog, settings, lines, input, at, approvalSecret, number })
  await takeStock(db, session, { sale, number, user, at, allowNegative: false })

  const stored = { ...sale, number, flags: sale.flags.filter((flag) => flag !== "negative_stock"), syncedAt: at, offline: false }
  await db.collection(C.sales).insertOne(toDoc(stored), { session })
  return stored
}

const tillCatalog = (catalog, lines) => {
  const byVariant = Object.fromEntries(lines.map((line) => [line.variantId, line]))
  const pctByProduct = {}
  const variants = catalog.variants.map((variant) => {
    pctByProduct[variant.productId] ??= byVariant[variant.id].productDiscountPct
    return { ...variant, active: true, price: byVariant[variant.id].unitPrice }
  })
  const products = catalog.products.map((product) => ({ ...product, status: "active", discountPct: pctByProduct[product.id] ?? 0 }))
  return { variants, products }
}

const pricingChanged = (catalog, lines, current, till) => {
  const { productById, variantById } = indexOf(catalog)
  const priceMoved = lines.some(({ variantId, unitPrice, productDiscountPct }) => {
    const variant = variantById[variantId]
    return variant.price !== unitPrice || (productById[variant.productId].discountPct ?? 0) !== productDiscountPct
  })
  return priceMoved || effectiveRate(current) !== effectiveRate(till)
}

const pricesInUse = async (db, session, { shopId, since, catalog, current }) => {
  const history = await db
    .collection(C.auditLog)
    .find({ shopId, at: { $gte: since }, $or: [{ kind: "product.update", target: { $in: catalog.products.map(({ id }) => id) } }, { kind: "settings.update" }] }, { session })
    .toArray()
  const seen = (values, field, entries) => new Set([...values, ...entries.filter(({ changes }) => changes?.[field]).map(({ changes }) => changes[field].from)])
  const products = Object.fromEntries(
    catalog.products.map((product) => {
      const entries = history.filter(({ target }) => target === product.id)
      return [product.id, { price: seen([product.price], "price", entries), discountPct: seen([product.discountPct ?? 0], "discountPct", entries) }]
    })
  )
  const settingsEntries = history.filter(({ kind }) => kind === "settings.update")
  const settings = Object.fromEntries(TILL_SETTINGS.map((field) => [field, seen([current[field]], field, settingsEntries)]))
  return { products, settings }
}

const checkTillPrices = (catalog, lines, pricing, inUse) => {
  const { variantById } = indexOf(catalog)
  const unknown = lines.some(({ variantId, unitPrice, productDiscountPct }) => {
    const allowed = inUse.products[variantById[variantId].productId]
    return !allowed.price.has(unitPrice) || !allowed.discountPct.has(productDiscountPct)
  })
  if (unknown || TILL_SETTINGS.some((field) => !inUse.settings[field].has(pricing[field]))) {
    throw new UserError("The prices on this sale are not ones the shop used during this shift. Show it to a supervisor.")
  }
}

const syncInSession = async (db, session, { user, shopId, now, approvalSecret }, input) => {
  const existing = await existingSale(db, session, input.clientId)
  if (existing) return fromDoc(existing)

  const shift = await db.collection(C.shifts).findOne({ _id: input.shiftId, shopId }, { session })
  if (!shift) throw new UserError("The shift for this sale was not found")
  if (shift.cashierId !== user.id) throw new UserError("This sale was made on another cashier's shift")
  const register = await registerFor(db, session, shopId, shift.registerId)
  const current = await shopSettings(db, session, shopId)
  const lines = merge(input.lines)
  const catalog = await loadCatalog(db, session, shopId, lines)

  const flags = new Set()
  let soldAt = input.soldAt
  if (soldAt > now.getTime() + CLOCK_SLACK) {
    soldAt = now.getTime()
    flags.add("clock")
  }
  if (soldAt < shift.openedAt.getTime() - CLOCK_SLACK) {
    soldAt = shift.openedAt.getTime()
    flags.add("clock")
  }
  if (shift.status !== "open") flags.add("after_close")
  const at = new Date(soldAt)

  const inUse = await pricesInUse(db, session, { shopId, since: new Date(shift.openedAt.getTime() - PRICE_HISTORY_SLACK), catalog, current })
  checkTillPrices(catalog, lines, { ...Object.fromEntries(TILL_SETTINGS.map((field) => [field, current[field]])), ...input.pricing }, inUse)

  const settings = { ...current, ...input.pricing, taxLabel: input.pricing.taxLabel ?? current.taxLabel }
  if (pricingChanged(catalog, lines, current, settings)) flags.add("price_mismatch")

  const shop = await db.collection(C.shops).findOne({ _id: shopId }, { session })
  const numberFree = inBlocks(register.code, shift.receiptBlocks, input.number) && !(await db.collection(C.sales).findOne({ registerId: register._id, number: input.number }, { session, projection: { _id: 1 } }))
  const number = numberFree ? input.number : await nextReceiptNumber(db, session, register)
  if (!numberFree) flags.add("renumbered")

  const sale = await buildSale(db, session, { user, shift, register, shop, catalog: tillCatalog(catalog, lines), settings, lines, input, at, approvalSecret, number })
  if (sale.total !== input.total) flags.add("total_mismatch")

  if (await takeStock(db, session, { sale, number, user, at, allowNegative: true })) flags.add("negative_stock")

  const stored = {
    ...sale,
    number,
    ...(numberFree ? {} : { offlineNumber: input.number }),
    flags: [...new Set([...sale.flags.filter((flag) => flag !== "negative_stock"), ...flags])],
    syncedAt: now,
    offline: true,
  }
  await db.collection(C.sales).insertOne(toDoc(stored), { session })
  return stored
}

const settle = async (client, db, clientId, work) => {
  try {
    return await withTransaction(client, work)
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    const existing = await db.collection(C.sales).findOne({ clientId })
    if (existing) return fromDoc(existing)
    throw error
  }
}

export const recordSale = async ({ db, client, user, shopId, approvalSecret, at = new Date() }, input) => {
  const request = parseInput(saleSchema, input)
  return settle(client, db, request.clientId, (session) => recordInSession(db, session, { user, shopId, at, approvalSecret }, request))
}

export const syncOfflineSale = async ({ db, client, user, shopId, approvalSecret, now = new Date() }, input) => {
  const request = parseInput(offlineSaleSchema, input)
  return settle(client, db, request.clientId, (session) => syncInSession(db, session, { user, shopId, now, approvalSecret }, request))
}
