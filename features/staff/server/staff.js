import "server-only"
import { SHOP_ID } from "@/features/catalog/lib/catalog"
import { hashPin } from "@/features/auth/server/pins"
import { UserError, parseInput } from "@/lib/errors"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { checkStaffChange, initialsOf } from "../lib/rules"
import { createStaffSchema, passwordSchema, pinSchema } from "../schemas"

const PLACEHOLDER_EMAIL_DOMAIN = "staff.invalid"

const toPerson = (doc) => ({
  id: doc._id,
  name: doc.name,
  role: doc.role,
  username: doc.username ?? null,
  email: doc.email?.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`) ? null : (doc.email ?? null),
  phone: doc.phone || null,
  shopIds: doc.shopIds ?? [],
  createdAt: doc.createdAt,
  banned: Boolean(doc.banned),
  removedAt: doc.removedAt ?? null,
  hasPin: Boolean(doc.pinHash),
})

export const listPeople = async (db) =>
  (await db.collection(C.users).find({}, { sort: { createdAt: 1 } }).toArray()).map(toPerson)

const latestOf = (...dates) => dates.filter(Boolean).reduce((max, at) => Math.max(max, new Date(at).getTime()), 0) || null

export const staffActivity = async (db) => {
  const [sales, shifts, movements] = await Promise.all([
    db.collection(C.sales).aggregate([{ $group: { _id: "$cashierId", count: { $sum: 1 }, last: { $max: "$soldAt" } } }]).toArray(),
    db.collection(C.shifts).aggregate([{ $group: { _id: "$cashierId", count: { $sum: 1 }, last: { $max: { $ifNull: ["$closedAt", "$openedAt"] } } } }]).toArray(),
    db.collection(C.movements).aggregate([{ $group: { _id: "$userId", last: { $max: "$createdAt" } } }]).toArray(),
  ])
  const byId = (rows) => Object.fromEntries(rows.map((row) => [row._id, row]))
  const [saleRows, shiftRows, movementRows] = [byId(sales), byId(shifts), byId(movements)]
  const ids = new Set([...Object.keys(saleRows), ...Object.keys(shiftRows), ...Object.keys(movementRows)])
  return Object.fromEntries(
    [...ids].map((id) => [
      id,
      { sales: saleRows[id]?.count ?? 0, shifts: shiftRows[id]?.count ?? 0, lastActive: latestOf(saleRows[id]?.last, shiftRows[id]?.last, movementRows[id]?.last) },
    ])
  )
}

export const directoryFor = (viewer, people, activity = {}, shops = []) =>
  Object.fromEntries(
    people.map((person) => {
      const base = { id: person.id, name: person.name, role: person.role, removed: Boolean(person.removedAt), disabled: person.banned && !person.removedAt }
      if (viewer.role !== "admin") return [person.id, base]
      return [
        person.id,
        {
          ...base,
          username: person.username,
          email: person.email,
          phone: person.phone,
          shop: person.role === "admin" ? "Head Office" : (shops.find(({ id }) => id === person.shopIds[0])?.name ?? "Shop"),
          joinedAt: new Date(person.createdAt).toISOString(),
          avatar: initialsOf(person.name),
          hasPin: person.hasPin,
          activity: activity[person.id] ?? { sales: 0, shifts: 0, lastActive: null },
        },
      ]
    })
  )

const guard = async (db, id, change) => {
  const reason = checkStaffChange(await listPeople(db), id, change)
  if (reason) throw new UserError(reason)
}

export const createStaff = async ({ auth, db, headers }, input) => {
  const data = parseInput(createStaffSchema, input)
  if (await db.collection(C.users).findOne({ username: data.username })) throw new UserError(`The username ${data.username} is taken.`)
  const email = data.email || `${data.username}@${PLACEHOLDER_EMAIL_DOMAIN}`
  const { user } = await auth.api.createUser({
    headers,
    body: {
      name: data.name.replace(/\s+/g, " "),
      email,
      password: data.password,
      role: data.role,
      data: { username: data.username, displayUsername: data.username, phone: data.phone, shopIds: [SHOP_ID] },
    },
  })
  return { id: user.id }
}

export const changeRole = async ({ auth, db, headers }, id, role) => {
  await guard(db, id, { role })
  await auth.api.setRole({ headers, body: { userId: id, role } })
  if (role !== "manager") await db.collection(C.users).updateOne({ _id: id }, { $unset: { pinHash: "" } })
  return {}
}

export const setAccess = async ({ auth, db, headers }, id, enabled) => {
  if (enabled) {
    const person = (await listPeople(db)).find((entry) => entry.id === id)
    if (!person || person.removedAt || person.role === "admin") throw new UserError("This person's access cannot be changed.")
    await auth.api.unbanUser({ headers, body: { userId: id } })
  } else {
    await guard(db, id, {})
    await auth.api.banUser({ headers, body: { userId: id, banReason: "Access turned off by the owner" } })
  }
  return {}
}

export const removeStaff = async ({ auth, db, headers }, id) => {
  await guard(db, id, {})
  await auth.api.banUser({ headers, body: { userId: id, banReason: "Removed from staff" } })
  await db.collection(C.users).updateOne({ _id: id }, { $set: { removedAt: new Date() }, $unset: { pinHash: "" } })
  return {}
}

export const setPassword = async ({ auth, db, headers }, id, password) => {
  const newPassword = parseInput(passwordSchema, password)
  await guard(db, id, { role: (await listPeople(db)).find((entry) => entry.id === id)?.role })
  await auth.api.setUserPassword({ headers, body: { userId: id, newPassword } })
  await auth.api.revokeUserSessions({ headers, body: { userId: id } })
  return {}
}

export const setSupervisorPin = async ({ db, pinSecret }, id, pin) => {
  const value = parseInput(pinSchema, pin)
  const person = (await listPeople(db)).find((entry) => entry.id === id)
  if (!person || person.removedAt || person.role !== "manager") throw new UserError("Only a supervisor on the team can have a PIN.")
  await db.collection(C.users).updateOne({ _id: id }, { $set: { pinHash: hashPin(pinSecret, id, value) } })
  return {}
}
