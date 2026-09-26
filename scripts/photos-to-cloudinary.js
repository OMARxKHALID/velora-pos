import { createMongoClient } from "@/server/db/connect"
import { COLLECTIONS as C } from "@/server/db/collections"
import { createCloudinary } from "@/server/cloudinary"
import { cloudinaryEnv, databaseEnv } from "@/config/env"
import { newId } from "@/shared/lib/id"

const settings = cloudinaryEnv()
if (!settings) throw new Error("Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET first")

const store = createCloudinary(settings)
const { MONGODB_URI, MONGODB_DB } = databaseEnv()
const client = createMongoClient(MONGODB_URI)

try {
  const users = client.db(MONGODB_DB).collection(C.users)
  const legacy = await users.find({ photo: { $type: "string" } }, { projection: { name: 1, photo: 1 } }).toArray()
  for (const { _id, name, photo } of legacy) {
    const saved = await store.upload(`velora/staff/${newId()}`, photo)
    await users.updateOne({ _id }, { $set: saved, $unset: { photo: "" } })
    console.log(`moved photo for ${name}`)
  }
  console.log(`${legacy.length} photos moved to Cloudinary`)
} finally {
  await client.close()
}
