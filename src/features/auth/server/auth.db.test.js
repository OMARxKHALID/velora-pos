import { beforeAll, describe, expect, test } from "bun:test"
import { hasTestDatabase, useTestDatabase } from "@/test/db"
import { COLLECTIONS as C } from "@/server/db/collections"
import { resetSampleTeam, seedSampleTeam } from "@/features/sample-data/server/sample-data"
import { changeRole, createStaff, directoryFor, listPeople, removeStaff, setAccess, setLeave, setPassword, setSupervisorPin, updateProfile } from "@/features/staff/server/staff"
import { readApproval } from "./approval-token"
import { approveDiscount } from "./approvals"
import { ensureFirstShop } from "@/features/shops/server/first-shop"
import { blockedReason } from "@/features/staff/server/access"
import { createAuth } from "./create-auth"

const SECRET = "test-secret-that-is-long-enough-123456"
const PASSWORD = "velora-sample"

describe.skipIf(!hasTestDatabase)("accounts, staff and approvals", () => {
  const context = useTestDatabase()
  const deps = {}
  const photoStore = new Set()

  const signIn = async (username, password = PASSWORD) => {
    const response = await deps.auth.api.signInUsername({ body: { username, password }, asResponse: true })
    if (response.status !== 200) return null
    return new Headers({ cookie: response.headers.get("set-cookie").split(";")[0] })
  }
  const as = async (username) => ({ ...deps, headers: await signIn(username) })
  const person = async (id) => (await listPeople(context.db)).find((entry) => entry.id === id)

  beforeAll(async () => {
    deps.auth = createAuth({ db: context.db, client: context.client, secret: SECRET, baseURL: "http://localhost:3000", rateLimit: false })
    deps.db = context.db
    deps.pinSecret = SECRET
    deps.photos = {
      upload: async (publicId) => (photoStore.add(publicId), { photoId: publicId, photoVersion: 1 }),
      remove: async (publicId) => photoStore.delete(publicId),
    }
    await ensureFirstShop(context.db)
    await seedSampleTeam({ auth: deps.auth, db: context.db, password: PASSWORD, pinSecret: SECRET })
  })

  test("the sample team signs in with their usernames, and the ids stay the ones old records use", async () => {
    for (const username of ["asif", "BILAL", " hamza"]) expect(await signIn(username.trim())).not.toBeNull()
    expect(await signIn("asif", "wrong-password")).toBeNull()
    const session = await deps.auth.api.getSession({ headers: await signIn("hamza") })
    expect(session.user).toMatchObject({ id: "u-cashier", role: "cashier", shopIds: ["shop-shoes"] })
    expect(session.user.pinHash).toBeUndefined()
  })

  test("nobody can sign themselves up", async () => {
    const error = await deps.auth.api.signUpEmail({ body: { name: "X", email: "x@x.com", password: "password-1" } }).catch((failure) => failure)
    expect(error.body.code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED")
  })

  test("the owner adds staff who can then sign in; usernames are unique; a cashier cannot add staff", async () => {
    const owner = await as("asif")
    const { id } = await createStaff(owner, { name: "Zain  Malik", role: "cashier", username: "Zain", password: "zain-pass-1", email: "", phone: "0300 1234567" })
    expect(id).toMatch(/^u-[a-f0-9]{16}$/)
    expect(await signIn("zain", "zain-pass-1")).not.toBeNull()
    expect((await person(id)).email).toBeNull()
    await expect(createStaff(owner, { name: "Other", role: "cashier", username: "zain", password: "password-1" })).rejects.toThrow("taken")
    await expect(createStaff(owner, { name: "Bad", role: "admin", username: "bad", password: "password-1" })).rejects.toThrow("Supervisor or Cashier")
    const cashier = await as("hamza")
    await expect(createStaff(cashier, { name: "Sneaky", role: "manager", username: "sneaky", password: "password-1" })).rejects.toMatchObject({ body: { code: "YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS" } })
  })

  test("the owner and the last supervisor are protected; a role change takes effect at once", async () => {
    const owner = await as("asif")
    await expect(changeRole(owner, "u-admin", "cashier")).rejects.toThrow("owner")
    await expect(changeRole(owner, "u-manager", "cashier")).rejects.toThrow("at least one supervisor")
    await expect(removeStaff(owner, "u-manager")).rejects.toThrow("at least one supervisor")
    await expect(setAccess(owner, "u-manager", false)).rejects.toThrow("at least one supervisor")

    const { id } = await createStaff(owner, { name: "Sara Supervisor", role: "manager", username: "sara", password: "sara-pass-1" })
    const saraSession = await signIn("sara", "sara-pass-1")
    await setSupervisorPin(owner, id, "4321")
    await changeRole(owner, id, "cashier")
    expect((await deps.auth.api.getSession({ headers: saraSession })).user.role).toBe("cashier")
    expect((await person(id)).hasPin).toBe(false)
  })

  test("turning access off signs the person out everywhere; turning it back on lets them in", async () => {
    const owner = await as("asif")
    const { id } = await createStaff(owner, { name: "Temp Cashier", role: "cashier", username: "temp", password: "temp-pass-1" })
    const session = await signIn("temp", "temp-pass-1")
    await setAccess(owner, id, false)
    expect(await deps.auth.api.getSession({ headers: session })).toBeNull()
    expect(await signIn("temp", "temp-pass-1")).toBeNull()
    await setAccess(owner, id, true)
    expect(await signIn("temp", "temp-pass-1")).not.toBeNull()
  })

  test("removed staff cannot sign in but keep their name for history; the owner can reset a password", async () => {
    const owner = await as("asif")
    const { id } = await createStaff(owner, { name: "Leaving Soon", role: "cashier", username: "leaving", password: "leave-pass-1" })
    const oldSession = await signIn("leaving", "leave-pass-1")
    await setPassword(owner, id, "brand-new-pass")
    expect(await deps.auth.api.getSession({ headers: oldSession })).toBeNull()
    expect(await signIn("leaving", "leave-pass-1")).toBeNull()
    expect(await signIn("leaving", "brand-new-pass")).not.toBeNull()

    await removeStaff(owner, id)
    expect(await signIn("leaving", "brand-new-pass")).toBeNull()
    await expect(setAccess(owner, id, true)).rejects.toThrow("cannot be changed")
    const directory = directoryFor({ role: "admin" }, await listPeople(context.db))
    expect(directory[id]).toMatchObject({ name: "Leaving Soon", removed: true })
  })

  test("other roles only see names and roles in the staff directory", async () => {
    const directory = directoryFor({ role: "cashier" }, await listPeople(context.db))
    expect(Object.keys(directory["u-manager"]).toSorted()).toEqual(["disabled", "id", "leave", "name", "removed", "role", "shopId"])
    expect(directoryFor({ role: "admin" }, await listPeople(context.db))["u-manager"]).toMatchObject({ username: "bilal", hasPin: true })
  })

  test("a supervisor PIN is checked on the server and returns a token tied to the cashier and discount", async () => {
    const approve = (input) => approveDiscount({ db: context.db, pinSecret: SECRET, approvalSecret: SECRET }, { cashierId: "u-cashier", discountPct: 10, ...input })
    const { approvedBy, approvalToken } = await approve({ supervisorId: "u-manager", pin: "1234" })
    expect(approvedBy).toBe("u-manager")
    expect(readApproval(SECRET, approvalToken, { cashierId: "u-cashier", discountPct: 10 })).toMatchObject({ supervisorId: "u-manager" })
    expect(readApproval(SECRET, approvalToken, { cashierId: "u-cashier", discountPct: 15 })).toBeNull()
    expect(readApproval(SECRET, approvalToken, { cashierId: "u-other", discountPct: 10 })).toBeNull()
    expect(readApproval("another-secret-that-is-long-enough", approvalToken, { cashierId: "u-cashier", discountPct: 10 })).toBeNull()

    await expect(approve({ supervisorId: "u-cashier", pin: "1234" })).rejects.toThrow("active supervisor")
    await expect(approve({ supervisorId: "u-manager", pin: "12a4" })).rejects.toThrow("4-digit")

    for (let attempt = 0; attempt < 5; attempt += 1) await expect(approve({ supervisorId: "u-manager", pin: "0000" })).rejects.toThrow("Wrong PIN")
    await expect(approve({ supervisorId: "u-manager", pin: "1234" })).rejects.toThrow("Too many wrong PINs")
    expect(await context.db.collection(C.pinFailures).countDocuments({ supervisorId: "u-manager" })).toBe(5)
  })

  test("resetting the sample data restores the team and keeps the owner signed in", async () => {
    const ownerSession = await signIn("asif")
    await resetSampleTeam({ auth: deps.auth, db: context.db, password: PASSWORD, pinSecret: SECRET, keepSignedIn: "u-admin" })
    const people = await listPeople(context.db)
    expect(people.map(({ id }) => id).toSorted()).toEqual(["u-admin", "u-cashier", "u-manager"])
    expect(people.every(({ banned, removedAt }) => !banned && !removedAt)).toBe(true)
    expect(await deps.auth.api.getSession({ headers: ownerSession })).not.toBeNull()
    expect(await context.db.collection(C.pinFailures).countDocuments()).toBe(0)
    const { approvedBy } = await approveDiscount({ db: context.db, pinSecret: SECRET, approvalSecret: SECRET }, { cashierId: "u-cashier", discountPct: 10, supervisorId: "u-manager", pin: "1234" })
    expect(approvedBy).toBe("u-manager")
  })

  test("wrong PINs sent at the same moment still stop after five", async () => {
    const approve = (pin) => approveDiscount({ db: context.db, pinSecret: SECRET, approvalSecret: SECRET }, { cashierId: "u-cashier", discountPct: 10, supervisorId: "u-manager", pin })
    const results = await Promise.allSettled(Array.from({ length: 20 }, (_, index) => approve(String(index).padStart(4, "0"))))
    const messages = results.map(({ reason }) => reason.message)
    expect(messages.filter((message) => message === "Wrong PIN").length).toBeLessThanOrEqual(5)
    expect(messages.filter((message) => message === "Wrong PIN" || message.startsWith("Too many wrong PINs"))).toHaveLength(20)
    expect(await context.db.collection(C.pinFailures).countDocuments({ supervisorId: "u-manager" })).toBeLessThanOrEqual(5)
    await context.db.collection(C.pinFailures).deleteMany({ supervisorId: "u-manager" })
  })

  test("profiles are checked and saved, and a person can move to another shop", async () => {
    const owner = await as("asif")
    const { id } = await createStaff(owner, { name: "Profile Person", role: "cashier", username: "profile", password: "profile-pass-1", cnic: "35202-1234567-1", city: "Lahore" })
    expect(await person(id)).toMatchObject({ cnic: "35202-1234567-1", city: "Lahore", shopIds: ["shop-shoes"] })
    await expect(updateProfile(owner, id, { name: "Profile Person", cnic: "123" })).rejects.toThrow("CNIC")
    await expect(updateProfile(owner, id, { name: "Profile Person", phone: "12" })).rejects.toThrow("Pakistani mobile")
    await expect(updateProfile(owner, id, { name: "Profile Person", email: "nope" })).rejects.toThrow("email")
    await expect(updateProfile(owner, id, { name: "P", shopId: "shop-none" })).rejects.toThrow()
    await updateProfile(owner, id, { name: "Profile Renamed", email: "profile@velora.pk", phone: "03001234567", address: "Gulberg", emergencyContact: "0321 7654321", photo: "data:image/jpeg;base64,AAAA" })
    const first = (await person(id)).photoId
    expect(await person(id)).toMatchObject({ name: "Profile Renamed", email: "profile@velora.pk", phone: "0300 1234567", address: "Gulberg", emergencyContact: "0321 7654321", photoId: expect.stringMatching(/^velora\/staff\//) })
    expect((await context.db.collection("users").findOne({ _id: id })).photo).toBeUndefined()
    await updateProfile(owner, id, { name: "Profile Renamed" })
    expect((await person(id)).photoId).toBe(first)
    await expect(updateProfile(owner, id, { name: "Profile Renamed", photo: "data:image/svg+xml;base64,AAAA" })).rejects.toThrow("photo")
    await updateProfile(owner, id, { name: "Profile Renamed", photo: "data:image/png;base64,BBBB" })
    expect(photoStore.has(first)).toBe(false)
    await updateProfile(owner, id, { name: "Profile Renamed", photo: null })
    expect(await person(id)).toMatchObject({ photoId: null, photo: null })
    expect(photoStore.size).toBe(0)
    await expect(updateProfile(owner, "u-admin", { name: "Hacker" })).rejects.toThrow("owner account")
  })

  test("someone on leave, or at a closed shop, cannot use the till or approve discounts", async () => {
    const owner = await as("asif")
    const { id } = await createStaff(owner, { name: "Leave Person", role: "manager", username: "leaver", password: "leaver-pass-1" })
    await setSupervisorPin(owner, id, "2468")
    const doc = () => context.db.collection("users").findOne({ _id: id })
    expect(await blockedReason(context.db, await doc())).toBeNull()

    await setLeave(owner, id, { from: "2020-01-01", until: "2099-12-31", note: "Hajj" })
    expect(await blockedReason(context.db, await doc())).toMatch("on leave until 2099-12-31")
    const approve = (supervisorId, shopId = "shop-shoes") => approveDiscount({ db: context.db, pinSecret: SECRET, approvalSecret: SECRET }, { cashierId: "u-cashier", shopId, discountPct: 10, supervisorId, pin: "2468" })
    await expect(approve(id)).rejects.toThrow("on leave")
    await expect(setLeave(owner, id, { from: "2026-02-01", until: "2026-01-01" })).rejects.toThrow("on or after")
    await expect(setLeave(owner, id, { from: "soon" })).rejects.toThrow("first day")

    await setLeave(owner, id, null)
    expect(await blockedReason(context.db, await doc())).toBeNull()
    expect((await approve(id)).approvedBy).toBe(id)
    await expect(approve(id, "shop-other")).rejects.toThrow("from this shop")

    await context.db.collection("shops").updateOne({ _id: "shop-shoes" }, { $set: { active: false } })
    expect(await blockedReason(context.db, await doc())).toBe("Your shop is closed.")
    expect(await blockedReason(context.db, await context.db.collection("users").findOne({ _id: "u-admin" }))).toBeNull()
    await context.db.collection("shops").updateOne({ _id: "shop-shoes" }, { $set: { active: true } })
  })
})
