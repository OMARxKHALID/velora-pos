import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { nextCookies } from "better-auth/next-js"
import { admin, username } from "better-auth/plugins"
import { newId } from "@/shared/lib/id"
import { ac, accessRoles } from "../lib/access"

const AUTH_COLLECTIONS = { user: "users", session: "sessions", account: "accounts", verification: "verifications", rateLimit: "rate_limits" }

const ADMIN_PATHS = ["ban-user", "create-user", "get-user", "has-permission", "impersonate-user", "list-users", "list-user-sessions", "remove-user", "revoke-user-session", "revoke-user-sessions", "set-role", "set-user-password", "stop-impersonating", "unban-user", "update-user"]

export const DISABLED_PATHS = [
  "/sign-in/email",
  "/sign-in/username",
  "/sign-in/social",
  "/sign-up/email",
  "/update-user",
  "/update-session",
  "/change-email",
  "/change-password",
  "/delete-user",
  "/delete-user/callback",
  "/is-username-available",
  "/request-password-reset",
  "/reset-password",
  "/verify-password",
  "/send-verification-email",
  "/verify-email",
  "/link-social",
  "/unlink-account",
  "/list-accounts",
  "/account-info",
  "/get-access-token",
  "/refresh-token",
  "/list-sessions",
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
  ...ADMIN_PATHS.map((path) => `/admin/${path}`),
]

export const newUserId = () => `u-${newId().replaceAll("-", "").slice(0, 16)}`

export const createAuth = ({ db, client, secret, baseURL, rateLimit = process.env.NODE_ENV === "production" }) =>
  betterAuth({
    appName: "Velora POS",
    secret,
    baseURL,
    disabledPaths: DISABLED_PATHS,
    database: mongodbAdapter(db, { client }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8, maxPasswordLength: 128 },
    user: {
      modelName: AUTH_COLLECTIONS.user,
      additionalFields: {
        phone: { type: "string", required: false, input: false },
        shopIds: { type: "string[]", required: false, input: false },
        removedAt: { type: "date", required: false, input: false },
        leaveFrom: { type: "string", required: false, input: false },
        leaveUntil: { type: "string", required: false, input: false },
        leaveNote: { type: "string", required: false, input: false },
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
