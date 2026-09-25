"use server"

import { refresh } from "next/cache"
import { actionResult, authorize } from "@/features/auth/server/session"
import { getDb, getMongoClient } from "@/lib/db/client"
import { authEnv } from "@/lib/env"
import { discardHeldCart, holdCart, takeHeldCart } from "./server/held-carts"
import { recordSale } from "./server/sales"
import { closeShift, openShift } from "./server/shifts"

const asCashier = (work, { refreshAfter = true } = {}) =>
  actionResult(async () => {
    const user = await authorize("cashier")
    const result = await work({ db: getDb(), client: getMongoClient(), user, shopId: user.shopId, approvalSecret: authEnv().BETTER_AUTH_SECRET })
    if (refreshAfter) refresh()
    return { record: result }
  })

export const openShiftAction = async (input) => asCashier((deps) => openShift(deps, input))

export const closeShiftAction = async (input) => asCashier((deps) => closeShift(deps, input))

export const recordSaleAction = async (input) => asCashier((deps) => recordSale(deps, input))

export const holdCartAction = async (input) => asCashier((deps) => holdCart(deps, input))

export const takeHeldCartAction = async (id) => asCashier((deps) => takeHeldCart(deps, id))

export const discardHeldCartAction = async (id) => asCashier((deps) => discardHeldCart(deps, id))
