"use server"

import { actionResult, authorize } from "@/features/auth/server/session"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { shopFor } from "@/features/shops/server/scope"
import { COLLECTIONS as C } from "@/lib/db/collections"
import { getDb, getMongoClient } from "@/lib/db/client"
import { updateSettings } from "./server/service"

export const updateSettingsAction = async (patch, scope = null) =>
  actionResult(async () => {
    const user = await authorize("admin")
    const db = getDb()
    const client = getMongoClient()
    const shopIds = scope === ALL_SHOPS ? (await db.collection(C.shops).find({}, { projection: { _id: 1 }, sort: { createdAt: 1, _id: 1 } }).toArray()).map(({ _id }) => _id) : [await shopFor(db, user, scope)]
    const records = []
    for (const shopId of shopIds) records.push(await updateSettings({ db, client, user, shopId }, patch))
    return { record: records[0] }
  })
