"use server"

import { actionResult, authorize } from "@/features/auth/server/session"
import { getDb, getMongoClient } from "@/server/db/client"
import { bumpAllLedgers } from "@/server/db/ledger-version"
import { deleteShop, saveRegister, saveShop } from "./server/service"

const asOwner = (work) =>
  actionResult(async () => {
    const user = await authorize("admin")
    const db = getDb()
    const record = await work({ db, client: getMongoClient(), user })
    await bumpAllLedgers(db).catch((error) => console.error(error))
    return { record }
  })

export const saveShopAction = async (input) => asOwner((deps) => saveShop(deps, input))

export const saveRegisterAction = async (input) => asOwner((deps) => saveRegister(deps, input))

export const deleteShopAction = async (shopId) => asOwner((deps) => deleteShop(deps, { shopId }))
