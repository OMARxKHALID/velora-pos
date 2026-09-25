"use server"

import { recordAction } from "@/features/auth/server/session"
import { adjustStock, receiveDelivery } from "./server/service"

export const receiveDeliveryAction = async (input) => recordAction(["manager"], (deps) => receiveDelivery(deps, input))

export const adjustStockAction = async (input) => recordAction(["manager"], (deps) => adjustStock(deps, input))
