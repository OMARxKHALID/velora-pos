import { createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"

export const ac = createAccessControl(defaultStatements)

export const accessRoles = {
  admin: ac.newRole(adminAc.statements),
  manager: ac.newRole({ user: [], session: [] }),
  cashier: ac.newRole({ user: [], session: [] }),
}
