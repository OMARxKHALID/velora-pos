"use server"

import { actionResult, authorize } from "@/features/auth/server/session"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { shopFor } from "@/features/shops/server/scope"
import { COLLECTIONS as C } from "@/server/db/collections"
import { getDb, getMongoClient } from "@/server/db/client"
import { bumpAllLedgers } from "@/server/db/ledger-version"
import { updateShopsSettings } from "./server/service"

export const updateSettingsAction = async (patch, scope = null) =>
  actionResult(async () => {
    const user = await authorize("admin")
    const db = getDb()
    const shopIds = scope === ALL_SHOPS ? (await db.collection(C.shops).find({}, { projection: { _id: 1 }, sort: { createdAt: 1, _id: 1 } }).toArray()).map(({ _id }) => _id) : [await shopFor(db, user, scope)]
    const [record] = await updateShopsSettings({ db, client: getMongoClient(), user, shopIds }, patch)
    await bumpAllLedgers(db).catch((error) => console.error(error))
    return { record }
  })
