export const COLLECTIONS = {
  shops: "shops",
  registers: "registers",
  products: "products",
  variants: "variants",
  stock: "stock",
  movements: "movements",
  sales: "sales",
  refunds: "refunds",
  shifts: "shifts",
  purchases: "purchases",
  heldCarts: "held_carts",
  settings: "settings",
  auditLog: "audit_log",
  counters: "counters",
  pinFailures: "pin_failures",
  users: "users",
  sessions: "sessions",
  accounts: "accounts",
  verifications: "verifications",
  rateLimits: "rate_limits",
}

export const toDoc = ({ id, ...rest }) => ({ _id: id, ...rest })

export const fromDoc = (doc) => {
  if (!doc) return null
  const { _id, ...rest } = doc
  return { id: _id, ...rest }
}
