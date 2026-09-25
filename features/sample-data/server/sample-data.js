import { SHOP_ID } from "@/features/catalog/lib/catalog"
import { createAccount } from "@/features/auth/server/accounts"
import { hashPin } from "@/features/auth/server/pins"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { SAMPLE_SUPERVISOR_PIN, SAMPLE_TEAM } from "../lib/team"
import { loadDocuments, seedDocuments } from "../lib/seed-documents"

const samplePeople = Object.values(SAMPLE_TEAM)

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

export const seedSampleTeam = async ({ auth, db, password, pinSecret }) => {
  for (const person of samplePeople) await createAccount(auth, { id: person.id, password, ...userDoc(person) })
  await db.collection(C.users).updateOne({ _id: "u-manager" }, { $set: { pinHash: hashPin(pinSecret, "u-manager", SAMPLE_SUPERVISOR_PIN) } })
  return samplePeople.length
}

export const resetSampleTeam = async ({ auth, db, password, pinSecret, keepSignedIn }) => {
  const sampleIds = samplePeople.map(({ id }) => id)
  const users = db.collection(C.users)
  const gone = (await users.find({ _id: { $nin: sampleIds } }, { projection: { _id: 1 } }).toArray()).map(({ _id }) => _id)
  await db.collection(C.sessions).deleteMany({ userId: { $in: gone } })
  await db.collection(C.accounts).deleteMany({ userId: { $in: gone } })
  await users.deleteMany({ _id: { $in: gone } })

  const ctx = await auth.$context
  for (const person of samplePeople) {
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
  await users.updateOne({ _id: "u-manager" }, { $set: { pinHash: hashPin(pinSecret, "u-manager", SAMPLE_SUPERVISOR_PIN) } })
  await db.collection(C.pinFailures).deleteMany({})
  return {}
}

const LEDGER = [C.shops, C.registers, C.settings, C.counters, C.products, C.variants, C.stock, C.movements, C.sales, C.refunds, C.shifts, C.purchases, C.heldCarts, C.auditLog, C.categories, C.exchanges, C.drawerEvents]

export const resetSampleData = async ({ db, now = Date.now() }) => {
  for (const name of LEDGER) await db.collection(name).deleteMany({})
  return loadDocuments(db, seedDocuments(now))
}
