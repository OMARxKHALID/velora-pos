"use server"

import { actionResult, authorize } from "@/features/auth/server/session"
import { getDb, getMongoClient } from "@/lib/db/client"
import { adjustStock, receiveDelivery } from "./server/service"

const asSupervisor = (work) =>
  actionResult(async () => {
    const user = await authorize("manager")
    const result = await work({ db: getDb(), client: getMongoClient(), user, shopId: user.shopId })
    return { record: result }
  })

export const receiveDeliveryAction = async (input) => asSupervisor((deps) => receiveDelivery(deps, input))

export const adjustStockAction = async (input) => asSupervisor((deps) => adjustStock(deps, input))
