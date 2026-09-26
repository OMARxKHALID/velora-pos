import "server-only"
import { unstable_cache } from "next/cache"
import { hashPin } from "@/features/auth/server/pins"
import { UserError, parseInput } from "@/shared/lib/errors"
import { newId } from "@/shared/lib/id"
import { COLLECTIONS as C } from "@/server/db/collections"
import { getDb } from "@/server/db/client"
import { cloudinary } from "@/server/cloudinary"
import { cleanLeave, cleanProfile } from "../lib/people"
import { checkStaffChange, initialsOf } from "../lib/rules"
import { createStaffSchema, passwordSchema, pinSchema, profileSchema } from "../schemas"

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
  hasPin: Boolean(doc.hasPin),
  cnic: doc.cnic ?? "",
  city: doc.city ?? "",
  address: doc.address ?? "",
  emergencyContact: doc.emergencyContact ?? "",
  photoId: doc.photoId ?? null,
  photo: doc.photoId ? (cloudinary()?.url(doc.photoId, doc.photoVersion) ?? null) : null,
  leave: doc.leaveFrom ? { from: doc.leaveFrom, until: doc.leaveUntil ?? null, note: doc.leaveNote ?? "" } : null,
})

const personFields = [{ $addFields: { hasPin: { $gt: ["$pinHash", null] } } }, { $project: { photo: 0, pinHash: 0 } }]

export const listPeople = async (db) => (await db.collection(C.users).aggregate([{ $sort: { createdAt: 1 } }, ...personFields]).toArray()).map(toPerson)

const personById = async (db, id) => {
  const [doc] = await db.collection(C.users).aggregate([{ $match: { _id: id } }, ...personFields]).toArray()
  return doc ? toPerson(doc) : null
}

const uploadPhoto = async (photos, photo) => {
  if (!photos) throw new UserError("Photo uploads are not set up yet. Add the Cloudinary settings to the server.")
  try {
    return await photos.upload(`velora/staff/${newId()}`, photo)
  } catch {
    throw new UserError("The photo could not be uploaded. Check the connection and try again.")
  }
}

const forgetPhoto = (photos, photoId) => (photoId && photos ? photos.remove(photoId).catch(() => null) : null)

const latestOf = (...dates) => dates.filter(Boolean).reduce((max, at) => Math.max(max, new Date(at).getTime()), 0) || null

export const staffActivity = async (db) => {
  const [sales, shifts, movements] = await Promise.all([
    db.collection(C.sales).aggregate([{ $sort: { cashierId: 1, soldAt: -1 } }, { $group: { _id: "$cashierId", count: { $sum: 1 }, last: { $first: "$soldAt" } } }]).toArray(),
    db.collection(C.shifts).aggregate([{ $group: { _id: "$cashierId", count: { $sum: 1 }, last: { $max: { $ifNull: ["$closedAt", "$openedAt"] } } } }]).toArray(),
    db.collection(C.movements).aggregate([{ $sort: { userId: 1, createdAt: -1 } }, { $group: { _id: "$userId", last: { $first: "$createdAt" } } }]).toArray(),
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
      const base = {
        id: person.id,
        name: person.name,
        role: person.role,
        removed: Boolean(person.removedAt),
        disabled: person.banned && !person.removedAt,
        shopId: person.role === "admin" ? null : (person.shopIds[0] ?? null),
        leave: person.leave,
        ...(person.id === viewer.id && { photo: person.photo }),
      }
      if (viewer.role !== "admin") return [person.id, base]
      return [
        person.id,
        {
          ...base,
          username: person.username,
          email: person.email,
          phone: person.phone,
          cnic: person.cnic,
          city: person.city,
          address: person.address,
          emergencyContact: person.emergencyContact,
          photo: person.photo,
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

const profileOf = (input) => {
  try {
    return cleanProfile(input)
  } catch (error) {
    throw new UserError(error.message)
  }
}

const workplaceFor = async (db, requested) => {
  const shop = await db.collection(C.shops).findOne(requested ? { _id: requested } : {}, { sort: { createdAt: 1, _id: 1 }, projection: { active: 1 } })
  if (!shop) throw new UserError("Choose the shop this person works at.")
  if (shop.active === false) throw new UserError("That shop is closed.")
  return shop._id
}

export const recentStaffActivity = unstable_cache(() => staffActivity(getDb()), ["staff-activity"], { revalidate: 300 })

const editable = async (db, id) => {
  const person = await personById(db, id)
  if (!person || person.removedAt) throw new UserError("This person is not on the team.")
  if (person.role === "admin") throw new UserError("The owner account cannot be changed.")
  return person
}

export const createStaff = async ({ auth, db, headers, photos }, input) => {
  const data = parseInput(createStaffSchema, input)
  const profile = profileOf(data)
  const shopId = await workplaceFor(db, data.shopId)
  if (await db.collection(C.users).findOne({ username: data.username })) throw new UserError(`The username ${data.username} is taken.`)
  const email = profile.email || `${data.username}@${PLACEHOLDER_EMAIL_DOMAIN}`
  const uploaded = profile.photo ? await uploadPhoto(photos, profile.photo) : null
  let user
  try {
    ;({ user } = await auth.api.createUser({
      headers,
      body: {
        name: profile.name,
        email,
        password: data.password,
        role: data.role,
        data: { username: data.username, displayUsername: data.username, phone: profile.phone, shopIds: [shopId] },
      },
    }))
  } catch (error) {
    await forgetPhoto(photos, uploaded?.photoId)
    throw error
  }
  await db.collection(C.users).updateOne({ _id: user.id }, { $set: { cnic: profile.cnic, city: profile.city, address: profile.address, emergencyContact: profile.emergencyContact, ...uploaded } })
  return { id: user.id }
}

export const updateProfile = async ({ db, photos }, id, input) => {
  const person = await editable(db, id)
  const data = parseInput(profileSchema, input)
  const profile = profileOf(data)
  const email = profile.email || person.email || `${person.username}@${PLACEHOLDER_EMAIL_DOMAIN}`
  if (email !== person.email && (await db.collection(C.users).findOne({ email, _id: { $ne: id } }))) throw new UserError("Another person already uses that email.")
  const shopIds = data.shopId && data.shopId !== person.shopIds[0] ? [await workplaceFor(db, data.shopId)] : person.shopIds
  const changingPhoto = data.photo !== undefined
  const uploaded = profile.photo ? await uploadPhoto(photos, profile.photo) : null
  await db.collection(C.users).updateOne(
    { _id: id },
    {
      $set: { name: profile.name, email, phone: profile.phone, cnic: profile.cnic, city: profile.city, address: profile.address, emergencyContact: profile.emergencyContact, ...uploaded, shopIds, updatedAt: new Date() },
      ...(changingPhoto && { $unset: { photo: "", ...(!uploaded && { photoId: "", photoVersion: "" }) } }),
    }
  )
  if (changingPhoto) await forgetPhoto(photos, person.photoId)
  return {}
}

export const setLeave = async ({ db }, id, input) => {
  await editable(db, id)
  let leave
  try {
    leave = cleanLeave(input)
  } catch (error) {
    throw new UserError(error.message)
  }
  await db.collection(C.users).updateOne(
    { _id: id },
    leave ? { $set: { leaveFrom: leave.from, leaveUntil: leave.until, leaveNote: leave.note } } : { $unset: { leaveFrom: "", leaveUntil: "", leaveNote: "" } }
  )
  return {}
}

export const changeRole = async ({ auth, db, headers }, id, role) => {
  await guard(db, id, { role })
  await auth.api.setRole({ headers, body: { userId: id, role } })
  if (role !== "manager") await db.collection(C.users).updateOne({ _id: id }, { $unset: { pinHash: "" } })
  return {}
}

export const setAccess = async ({ auth, db, headers }, id, enabled) => {
  if (enabled) {
    const person = await personById(db, id)
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
  await guard(db, id, { role: (await personById(db, id))?.role })
  await auth.api.setUserPassword({ headers, body: { userId: id, newPassword } })
  await auth.api.revokeUserSessions({ headers, body: { userId: id } })
  return {}
}

export const setSupervisorPin = async ({ db, pinSecret }, id, pin) => {
  const value = parseInput(pinSchema, pin)
  const person = await personById(db, id)
  if (!person || person.removedAt || person.role !== "manager") throw new UserError("Only a supervisor on the team can have a PIN.")
  await db.collection(C.users).updateOne({ _id: id }, { $set: { pinHash: hashPin(pinSecret, id, value) } })
  return {}
}
