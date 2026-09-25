"use server"

import { refresh } from "next/cache"
import { getAuth } from "@/features/auth/server/auth"
import { UserError, actionResult, authorize } from "@/features/auth/server/session"
import { getDb } from "@/lib/db/client"
import { appEnv, authEnv, pinSecret } from "@/lib/env"
import { resetDemoTeam } from "./server/team"

export const resetDemoTeamAction = async () =>
  actionResult(async () => {
    const owner = await authorize("admin")
    if (!appEnv().DEMO_MODE) throw new UserError("Demo reset is only available when DEMO_MODE is on.")
    await resetDemoTeam({ auth: getAuth(), db: getDb(), password: authEnv().DEMO_PASSWORD, pinSecret: pinSecret(), keepSignedIn: owner.id })
    refresh()
    return {}
  })
