import { SHOP_ID } from "@/features/catalog/lib/catalog"
import { createAccount } from "@/features/auth/server/accounts"
import { hashPin } from "@/features/auth/server/pins"
import { COLLECTIONS as C } from "@/server/db/collections"
import { SAMPLE_SUPERVISOR_PIN, SAMPLE_TEAM } from "../lib/team"

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
