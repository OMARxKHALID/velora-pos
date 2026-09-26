"use server"

import { recordAction } from "@/features/auth/server/session"
import { withoutCosts } from "@/features/sales/lib/for-viewer"
import { discardHeldCart, holdCart, takeHeldCart } from "./server/held-carts"
import { openDrawer } from "./server/drawer"
import { recordSale } from "./server/sales"
import { closeShift, openShift, reserveReceipts } from "./server/shifts"

export const openShiftAction = async (input) => recordAction(["cashier"], (deps) => openShift(deps, input))

export const closeShiftAction = async (input) => recordAction(["cashier"], (deps) => closeShift(deps, input))

export const reserveReceiptsAction = async (input) => recordAction(["cashier"], (deps) => reserveReceipts(deps, input))

export const recordSaleAction = async (input) => recordAction(["cashier"], async (deps) => withoutCosts(await recordSale(deps, input)))

export const holdCartAction = async (input) => recordAction(["cashier"], (deps) => holdCart(deps, input))

export const takeHeldCartAction = async (id) => recordAction(["cashier"], (deps) => takeHeldCart(deps, id))

export const discardHeldCartAction = async (id) => recordAction(["cashier"], (deps) => discardHeldCart(deps, id))

export const openDrawerAction = async (input) => recordAction(["cashier", "manager"], (deps) => openDrawer(deps, input))
