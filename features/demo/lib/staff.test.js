import { expect, test } from "bun:test"
import { activeStaff, applyAddStaff, applyRemoveStaff, applyTransferRole, approverFor, initialStaff, staffName } from "./staff"

test("added staff get an id, role and a name that history can resolve", () => {
  const { staff, member } = applyAddStaff(initialStaff, { name: "  sana   malik ", role: "cashier" })
  expect(member.id).toMatch(/^u-cashier-[a-f0-9]{8}$/)
  expect(member.name).toBe("sana malik")
  expect(member.email).toBe("sana.malik@velora.pk")
  expect(staffName(member.id, staff)).toBe("sana malik")
  expect(() => applyAddStaff(initialStaff, { name: "", role: "cashier" })).toThrow("Enter a name")
  expect(() => applyAddStaff(initialStaff, { name: "X", role: "admin" })).toThrow("Supervisor or Cashier")
})

test("removing someone keeps their name for old records but hides them from the team", () => {
  const { staff, member } = applyAddStaff(initialStaff, { name: "Sana Malik", role: "cashier" })
  const after = applyRemoveStaff(staff, member.id)
  expect(activeStaff(after).map(({ id }) => id)).not.toContain(member.id)
  expect(staffName(member.id, after)).toBe("Sana Malik")
})

test("the owner and the last supervisor are protected", () => {
  expect(() => applyRemoveStaff(initialStaff, "u-admin")).toThrow("owner")
  expect(() => applyTransferRole(initialStaff, "u-admin", "cashier")).toThrow("owner")
  expect(() => applyRemoveStaff(initialStaff, "u-manager")).toThrow("at least one supervisor")
  expect(() => applyTransferRole(initialStaff, "u-manager", "cashier")).toThrow("at least one supervisor")

  const { staff } = applyAddStaff(initialStaff, { name: "Second Supervisor", role: "manager" })
  expect(applyTransferRole(staff, "u-manager", "cashier")["u-manager"].role).toBe("cashier")
})

test("approver is the first active supervisor", () => {
  expect(approverFor(initialStaff).id).toBe("u-manager")
  const { staff, member } = applyAddStaff(initialStaff, { name: "New Boss", role: "manager" })
  const swapped = applyRemoveStaff(staff, "u-manager")
  expect(approverFor(swapped).id).toBe(member.id)
})
