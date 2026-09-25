import { SHOP_ID } from "@/features/catalog/lib/catalog"
import { hashPin } from "@/features/auth/server/pins"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { DEMO_MANAGER_PIN, initialStaff } from "../lib/staff"
import { loadDocuments, seedDocuments } from "../lib/seed-documents"

const demoPeople = Object.values(initialStaff)

const userDoc = (person) => ({
  name: person.name,
  email: person.email,
  emailVerified: true,
  username: person.username,
  displayUsername: person.username,
  role: person.role,
  banned: false,
  phone: person.phone,
  shopIds: person.role === "admin" ? [] : [SHOP_ID],
  createdAt: new Date(person.joinedAt),
  updatedAt: new Date(person.joinedAt),
})

export const createAccount = async (auth, { id, password, ...fields }) => {
  const ctx = await auth.$context
  await ctx.internalAdapter.createUser({ id, ...fields })
  await ctx.internalAdapter.linkAccount({ userId: id, providerId: "credential", accountId: id, password: await ctx.password.hash(password) })
}

export const seedDemoTeam = async ({ auth, db, password, pinSecret }) => {
  for (const person of demoPeople) await createAccount(auth, { id: person.id, password, ...userDoc(person) })
  await db.collection(C.users).updateOne({ _id: "u-manager" }, { $set: { pinHash: hashPin(pinSecret, "u-manager", DEMO_MANAGER_PIN) } })
  return demoPeople.length
}

export const resetDemoTeam = async ({ auth, db, password, pinSecret, keepSignedIn }) => {
  const demoIds = demoPeople.map(({ id }) => id)
  const users = db.collection(C.users)
  const gone = (await users.find({ _id: { $nin: demoIds } }, { projection: { _id: 1 } }).toArray()).map(({ _id }) => _id)
  await db.collection(C.sessions).deleteMany({ userId: { $in: gone } })
  await db.collection(C.accounts).deleteMany({ userId: { $in: gone } })
  await users.deleteMany({ _id: { $in: gone } })

  const ctx = await auth.$context
  for (const person of demoPeople) {
    const exists = await users.findOne({ _id: person.id }, { projection: { _id: 1 } })
    if (!exists) {
      await createAccount(auth, { id: person.id, password, ...userDoc(person) })
      continue
    }
    await users.updateOne({ _id: person.id }, { $set: userDoc(person), $unset: { banReason: "", banExpires: "", removedAt: "", pinHash: "" } })
    if (person.id === keepSignedIn) continue
    await db.collection(C.accounts).updateOne({ userId: person.id, providerId: "credential" }, { $set: { password: await ctx.password.hash(password) } })
    await db.collection(C.sessions).deleteMany({ userId: person.id })
  }
  await users.updateOne({ _id: "u-manager" }, { $set: { pinHash: hashPin(pinSecret, "u-manager", DEMO_MANAGER_PIN) } })
  await db.collection(C.pinFailures).deleteMany({})
  return {}
}

const LEDGER = [C.shops, C.registers, C.settings, C.counters, C.products, C.variants, C.stock, C.movements, C.sales, C.refunds, C.shifts, C.purchases, C.heldCarts, C.auditLog]

export const resetDemoData = async ({ db, now = Date.now() }) => {
  for (const name of LEDGER) await db.collection(name).deleteMany({})
  return loadDocuments(db, seedDocuments(now))
}
