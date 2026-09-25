"use server"

import { actionResult, authorize } from "@/features/auth/server/session"
import { getDb, getMongoClient } from "@/lib/db/client"
import { decideRefund, requestRefund } from "./server/service"

export const requestRefundAction = async (input) =>
  actionResult(async () => {
    const user = await authorize("cashier", "manager")
    return { record: await requestRefund({ db: getDb(), client: getMongoClient(), user, shopId: user.shopId }, input) }
  })

export const decideRefundAction = async (refundId, approve) =>
  actionResult(async () => {
    const user = await authorize("manager")
    return { record: await decideRefund({ db: getDb(), client: getMongoClient(), user, shopId: user.shopId }, { refundId, approve }) }
  })
