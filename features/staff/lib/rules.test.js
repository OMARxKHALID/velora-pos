import { expect, test } from "bun:test"
import { LAST_SUPERVISOR, checkStaffChange, initialsOf } from "./rules"

const people = [
  { id: "u-admin", role: "admin" },
  { id: "u-manager", role: "manager" },
  { id: "u-cashier", role: "cashier" },
  { id: "u-left", role: "cashier", removedAt: new Date() },
]

test("the owner, people who left and the last supervisor are protected", () => {
  expect(checkStaffChange(people, "u-admin", { role: "cashier" })).toMatch("owner")
  expect(checkStaffChange(people, "u-left", {})).toMatch("not on the team")
  expect(checkStaffChange(people, "u-nobody", {})).toMatch("not on the team")
  expect(checkStaffChange(people, "u-manager", { role: "cashier" })).toBe(LAST_SUPERVISOR)
  expect(checkStaffChange(people, "u-manager", {})).toBe(LAST_SUPERVISOR)
  expect(checkStaffChange(people, "u-manager", { role: "manager" })).toBeNull()
  expect(checkStaffChange(people, "u-cashier", { role: "admin" })).toMatch("Supervisor or Cashier")
  expect(checkStaffChange(people, "u-cashier", { role: "manager" })).toBeNull()
  expect(checkStaffChange([...people, { id: "u-manager-2", role: "manager" }], "u-manager", { role: "cashier" })).toBeNull()
})

test("initials come from the first two words", () => {
  expect(initialsOf("  sana   malik khan ")).toBe("SM")
  expect(initialsOf("ASIF")).toBe("A")
})
