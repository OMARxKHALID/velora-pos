import { expect, test } from "bun:test"
import { activeStaff, applyAddStaff, applyRemoveStaff, applySetLeave, applyTransferRole, applyUpdateProfile, approverFor, canApprove, initialStaff, isOnLeave, staffName, worksAtClosedShop } from "./staff"

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

test("profiles keep optional details tidy and reject bad CNICs and phone numbers", () => {
  const { member } = applyAddStaff(initialStaff, { name: "Sana Malik", role: "cashier", cnic: "3520212345671", phone: "+923001234567", city: " Lahore ", address: "12  Mall Road" })
  expect(member).toMatchObject({ cnic: "35202-1234567-1", phone: "0300 1234567", city: "Lahore", address: "12 Mall Road", photo: null })
  expect(() => applyAddStaff(initialStaff, { name: "X", role: "cashier", cnic: "123" })).toThrow("CNIC")
  expect(() => applyAddStaff(initialStaff, { name: "X", role: "cashier", phone: "12345" })).toThrow("Pakistani mobile")
  expect(() => applyAddStaff(initialStaff, { name: "X", role: "cashier", photo: "javascript:alert(1)" })).toThrow("photo")
})

test("anyone on the team, the owner too, can have their profile edited", () => {
  const updated = applyUpdateProfile(initialStaff, "u-admin", { city: "Karachi", name: "Asif Khan" })
  expect(updated["u-admin"]).toMatchObject({ city: "Karachi", name: "Asif Khan", avatar: "AK", role: "admin" })
  expect(() => applyUpdateProfile(initialStaff, "u-nobody", { city: "Karachi" })).toThrow("not on the team")
})

test("leave blocks approvals while it runs, and approval falls back to the owner", () => {
  const onLeave = applySetLeave(initialStaff, "u-manager", { from: "2026-09-20", until: "2026-09-30" })
  expect(isOnLeave(onLeave["u-manager"], "2026-09-25")).toBe(true)
  expect(isOnLeave(onLeave["u-manager"], "2026-10-01")).toBe(false)
  expect(canApprove(onLeave, "u-manager", "2026-09-25")).toBe(false)
  expect(approverFor(onLeave, "2026-09-25").id).toBe("u-admin")
  expect(approverFor(onLeave, "2026-10-01").id).toBe("u-manager")
  expect(applySetLeave(onLeave, "u-manager", null)["u-manager"].leave).toBeNull()
  expect(() => applySetLeave(initialStaff, "u-manager", { from: "2026-09-20", until: "2026-09-01" })).toThrow("on or after")
  expect(() => applySetLeave(initialStaff, "u-admin", { from: "2026-09-20" })).toThrow("owner")
})

test("approval stays inside the shop and a closed shop locks its staff out", () => {
  const shopId = initialStaff["u-manager"].shopId
  expect(approverFor(initialStaff, "2026-09-25", shopId).id).toBe("u-manager")
  expect(approverFor(initialStaff, "2026-09-25", "shop-other").id).toBe("u-admin")
  const shops = [{ id: shopId, active: false }]
  expect(worksAtClosedShop(initialStaff["u-cashier"], shops)).toBe(true)
  expect(worksAtClosedShop(initialStaff["u-admin"], shops)).toBe(false)
  expect(worksAtClosedShop(initialStaff["u-cashier"], [{ id: shopId, active: true }])).toBe(false)
})
