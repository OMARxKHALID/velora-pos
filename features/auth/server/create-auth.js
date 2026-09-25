import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { nextCookies } from "better-auth/next-js"
import { admin, username } from "better-auth/plugins"
import { newId } from "@/lib/id"
import { ac, accessRoles } from "../lib/access"

const AUTH_COLLECTIONS = { user: "users", session: "sessions", account: "accounts", verification: "verifications", rateLimit: "rate_limits" }

export const newUserId = () => `u-${newId().replaceAll("-", "").slice(0, 16)}`

export const createAuth = ({ db, client, secret, baseURL, rateLimit = process.env.NODE_ENV === "production" }) =>
  betterAuth({
    appName: "Velora POS",
    secret,
    baseURL,
    database: mongodbAdapter(db, { client }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8, maxPasswordLength: 128 },
    user: {
      modelName: AUTH_COLLECTIONS.user,
      additionalFields: {
        phone: { type: "string", required: false },
        shopIds: { type: "string[]", required: false },
        removedAt: { type: "date", required: false, input: false },
        pinHash: { type: "string", required: false, input: false, returned: false },
      },
    },
    session: {
      modelName: AUTH_COLLECTIONS.session,
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 60,
    },
    account: { modelName: AUTH_COLLECTIONS.account },
    verification: { modelName: AUTH_COLLECTIONS.verification },
    rateLimit: { enabled: rateLimit, storage: "database", modelName: AUTH_COLLECTIONS.rateLimit },
    advanced: {
      database: { generateId: ({ model }) => (model === "user" || model === AUTH_COLLECTIONS.user ? newUserId() : newId()) },
    },
    plugins: [
      username({ minUsernameLength: 3, maxUsernameLength: 30 }),
      admin({
        ac,
        roles: accessRoles,
        defaultRole: "cashier",
        adminRoles: ["admin"],
        bannedUserMessage: "This account has been turned off by the owner.",
      }),
      nextCookies(),
    ],
  })
