"use server"

import { recordAction } from "@/features/auth/server/session"
import { decideRefund, requestRefund } from "./server/service"

export const requestRefundAction = async (input) => recordAction(["cashier", "manager"], (deps) => requestRefund(deps, input))

export const decideRefundAction = async (refundId, approve) => recordAction(["manager"], (deps) => decideRefund(deps, { refundId, approve }))
