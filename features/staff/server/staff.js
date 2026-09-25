import "server-only"
import { SHOP_ID } from "@/features/catalog/lib/catalog"
import { SHOP_NAME } from "@/features/shops/lib/constants"
import { hashPin } from "@/features/auth/server/pins"
import { UserError } from "@/features/auth/server/session-errors"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { checkStaffChange, initialsOf } from "../lib/rules"
import { createStaffSchema, passwordSchema, pinSchema } from "../schemas"

export const PLACEHOLDER_EMAIL_DOMAIN = "staff.invalid"

const parse = (schema, value) => {
  const result = schema.safeParse(value)
  if (!result.success) throw new UserError(result.error.issues[0].message)
  return result.data
}

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

export const directoryFor = (viewer, people) =>
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
          shop: person.role === "admin" ? "Head Office" : SHOP_NAME,
          joinedAt: new Date(person.createdAt).toISOString(),
          avatar: initialsOf(person.name),
          hasPin: person.hasPin,
        },
      ]
    })
  )

const guard = async (db, id, change) => {
  const reason = checkStaffChange(await listPeople(db), id, change)
  if (reason) throw new UserError(reason)
}

export const createStaff = async ({ auth, db, headers }, input) => {
  const data = parse(createStaffSchema, input)
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
  const newPassword = parse(passwordSchema, password)
  await guard(db, id, { role: (await listPeople(db)).find((entry) => entry.id === id)?.role })
  await auth.api.setUserPassword({ headers, body: { userId: id, newPassword } })
  await auth.api.revokeUserSessions({ headers, body: { userId: id } })
  return {}
}

export const setSupervisorPin = async ({ db, pinSecret }, id, pin) => {
  const value = parse(pinSchema, pin)
  const person = (await listPeople(db)).find((entry) => entry.id === id)
  if (!person || person.removedAt || person.role !== "manager") throw new UserError("Only a supervisor on the team can have a PIN.")
  await db.collection(C.users).updateOne({ _id: id }, { $set: { pinHash: hashPin(pinSecret, id, value) } })
  return {}
}
