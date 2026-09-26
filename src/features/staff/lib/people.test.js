import { expect, test } from "bun:test"
import { activeStaff, staffName, supervisorsOf } from "./people"

const team = {
  "u-manager": { id: "u-manager", name: "Bilal Ahmed", role: "manager" },
  "u-cashier": { id: "u-cashier", name: "Hamza Ali", role: "cashier" },
  "u-manager-2": { id: "u-manager-2", name: "Zara Khan", role: "manager" },
  "u-manager-off": { id: "u-manager-off", name: "Off Duty", role: "manager", disabled: true },
  "u-cashier-gone": { id: "u-cashier-gone", name: "Gone", role: "cashier", removed: true },
}

test("people who left keep their name on old records but leave the team list", () => {
  expect(staffName("u-cashier-gone", team)).toBe("Gone")
  expect(staffName("u-nobody", team)).toBe("Unknown")
  expect(staffName("u-cashier")).toBe("Unknown")
  expect(activeStaff(team).map(({ id }) => id)).not.toContain("u-cashier-gone")
  expect(activeStaff(team).map(({ id }) => id)).toContain("u-manager-off")
})

test("only active supervisors can be asked to approve", () => {
  expect(supervisorsOf(team).map(({ id }) => id)).toEqual(["u-manager", "u-manager-2"])
})
