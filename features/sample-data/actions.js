"use server"

import { refresh } from "next/cache"
import { getAuth } from "@/features/auth/server/auth"
import { actionResult, authorize } from "@/features/auth/server/session"
import { UserError } from "@/lib/errors"
import { getDb } from "@/lib/db/client"
import { appEnv, authEnv, pinSecret } from "@/lib/env"
import { resetSampleData, resetSampleTeam } from "./server/sample-data"

export const resetSampleDataAction = async () =>
  actionResult(async () => {
    const owner = await authorize("admin")
    if (!appEnv().SAMPLE_DATA) throw new UserError("Resetting sample data is only available when SAMPLE_DATA is on.")
    const db = getDb()
    await resetSampleTeam({ auth: getAuth(), db, password: authEnv().SAMPLE_PASSWORD, pinSecret: pinSecret(), keepSignedIn: owner.id })
    await resetSampleData({ db })
    refresh()
    return {}
  })
