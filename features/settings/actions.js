"use server"

import { actionResult, authorize } from "@/features/auth/server/session"
import { shopFor } from "@/features/shops/server/scope"
import { getDb, getMongoClient } from "@/lib/db/client"
import { updateSettings } from "./server/service"

export const updateSettingsAction = async (patch) =>
  actionResult(async () => {
    const user = await authorize("admin")
    const db = getDb()
    return { record: await updateSettings({ db, client: getMongoClient(), user, shopId: await shopFor(db, user, null) }, patch) }
  })
