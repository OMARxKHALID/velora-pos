export const staffName = (id, staff) => staff?.[id]?.name ?? "Unknown"

export const activeStaff = (staff) => Object.values(staff ?? {}).filter((person) => !person.removed)

export const supervisorsOf = (staff) => activeStaff(staff).filter(({ role, disabled }) => role === "manager" && !disabled)
