"use server"

import { refresh } from "next/cache"
import { headers } from "next/headers"
import { getAuth } from "@/features/auth/server/auth"
import { actionResult, authorize, pinSecret } from "@/features/auth/server/session"
import { getDb } from "@/lib/db/client"
import { changeRole, createStaff, removeStaff, setAccess, setPassword, setSupervisorPin } from "./server/staff"

const asOwner = (work) =>
  actionResult(async () => {
    await authorize("admin")
    const result = await work({ auth: getAuth(), db: getDb(), headers: await headers(), pinSecret: pinSecret() })
    refresh()
    return result
  })

export const createStaffAction = async (input) => asOwner((deps) => createStaff(deps, input))

export const changeRoleAction = async (id, role) => asOwner((deps) => changeRole(deps, id, role))

export const setAccessAction = async (id, enabled) => asOwner((deps) => setAccess(deps, id, Boolean(enabled)))

export const removeStaffAction = async (id) => asOwner((deps) => removeStaff(deps, id))

export const setPasswordAction = async (id, password) => asOwner((deps) => setPassword(deps, id, password))

export const setSupervisorPinAction = async (id, pin) => asOwner((deps) => setSupervisorPin(deps, id, pin))
