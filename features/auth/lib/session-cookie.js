import { isRole, toSessionUser } from "./demo-users"

// Demo sessions: the cookie carries who signed in. It is not signed, so a real build replaces this with real auth.
export const USER_ID_PATTERN = /^u-[a-z0-9-]{1,40}$/
const MAX_DISABLED = 50

export const cleanIdentity = ({ id, name, role } = {}) => {
  if (typeof id !== "string" || !USER_ID_PATTERN.test(id)) return null
  if (!isRole(role)) return null
  const cleanName = typeof name === "string" ? name.trim().replace(/\s+/g, " ").slice(0, 80) : ""
  if (!cleanName) return null
  return { id, name: cleanName, role }
}

export const encodeSession = (identity) => Buffer.from(JSON.stringify(identity)).toString("base64url")

export const decodeSession = (raw) => {
  if (typeof raw !== "string" || !raw) return null
  try {
    const identity = cleanIdentity(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")))
    return identity ? toSessionUser(identity) : null
  } catch {
    return null
  }
}

export const parseDisabled = (raw) => [...new Set((raw ?? "").split(",").filter((id) => USER_ID_PATTERN.test(id)))].slice(0, MAX_DISABLED)

export const serializeDisabled = (ids) => [...new Set(ids.filter((id) => USER_ID_PATTERN.test(id)))].slice(0, MAX_DISABLED).join(",")
