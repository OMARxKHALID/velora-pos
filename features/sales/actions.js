"use server"

import { recordAction } from "@/features/auth/server/session"
import { exchangeItem } from "./server/exchanges"

export const exchangeItemAction = async (input) => recordAction(["cashier", "manager"], (deps) => exchangeItem(deps, input))
