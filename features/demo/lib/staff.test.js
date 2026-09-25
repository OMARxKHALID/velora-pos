import { expect, test } from "bun:test"
import { activeStaff, canApprove, canSell, initialStaff, staffName, supervisorsOf } from "./staff"

const team = {
  ...initialStaff,
  "u-manager-2": { id: "u-manager-2", name: "Zara Khan", role: "manager" },
  "u-manager-off": { id: "u-manager-off", name: "Off Duty", role: "manager", disabled: true },
  "u-cashier-gone": { id: "u-cashier-gone", name: "Gone", role: "cashier", removed: true },
}

test("people who left keep their name on old records but leave the team list", () => {
  expect(staffName("u-cashier-gone", team)).toBe("Gone")
  expect(staffName("u-nobody", team)).toBe("Unknown")
  expect(activeStaff(team).map(({ id }) => id)).not.toContain("u-cashier-gone")
  expect(activeStaff(team).map(({ id }) => id)).toContain("u-manager-off")
})

test("only active supervisors approve, and only active cashiers sell", () => {
  expect(canApprove(team, "u-manager")).toBe(true)
  expect(canApprove(team, "u-manager-off")).toBe(false)
  expect(canApprove(team, "u-cashier")).toBe(false)
  expect(canSell(team, "u-cashier")).toBe(true)
  expect(canSell(team, "u-cashier-gone")).toBe(false)
  expect(canSell(team, "u-manager")).toBe(false)
  expect(supervisorsOf(team).map(({ id }) => id)).toEqual(["u-manager", "u-manager-2"])
})
