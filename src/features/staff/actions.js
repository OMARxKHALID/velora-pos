"use server"

import { refresh } from "next/cache"
import { headers } from "next/headers"
import { getAuth } from "@/features/auth/server/auth"
import { actionResult, authorize } from "@/features/auth/server/session"
import { writeAudit } from "@/server/db/audit"
import { getDb } from "@/server/db/client"
import { cloudinary } from "@/server/cloudinary"
import { pinSecret } from "@/config/env"
import { changeRole, createStaff, removeStaff, setAccess, setLeave, setPassword, setSupervisorPin, updateProfile } from "./server/staff"

const asOwner = (kind, target, changes, work) =>
  actionResult(async () => {
    const owner = await authorize("admin")
    const db = getDb()
    const result = await work({ auth: getAuth(), db, headers: await headers(), pinSecret: pinSecret(), photos: cloudinary() })
    await writeAudit(db, undefined, { shopId: null, userId: owner.id, kind, target: target ?? result?.id ?? null, changes }).catch((error) => console.error(error))
    refresh()
    return result
  })

export const createStaffAction = async (input) => asOwner("staff.create", null, { role: { from: null, to: input?.role ?? null } }, (deps) => createStaff(deps, input))

export const changeRoleAction = async (id, role) => asOwner("staff.role", id, { role: { from: null, to: role } }, (deps) => changeRole(deps, id, role))

export const setAccessAction = async (id, enabled) => asOwner("staff.access", id, { enabled: { from: null, to: Boolean(enabled) } }, (deps) => setAccess(deps, id, Boolean(enabled)))

export const removeStaffAction = async (id) => asOwner("staff.remove", id, null, (deps) => removeStaff(deps, id))

export const setPasswordAction = async (id, password) => asOwner("staff.password", id, null, (deps) => setPassword(deps, id, password))

export const setSupervisorPinAction = async (id, pin) => asOwner("staff.pin", id, null, (deps) => setSupervisorPin(deps, id, pin))

export const updateProfileAction = async (id, input) => asOwner("staff.profile", id, null, (deps) => updateProfile(deps, id, input))

export const setLeaveAction = async (id, leave) => asOwner("staff.leave", id, { leave: { from: null, to: leave ?? null } }, (deps) => setLeave(deps, id, leave))
