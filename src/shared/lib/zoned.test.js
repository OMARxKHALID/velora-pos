import { expect, test } from "bun:test"
import { hourIn, startOfDateIn, startOfDayIn } from "./zoned"

test("today starts at the shop's midnight, wherever the server runs", () => {
  const now = Date.parse("2026-09-25T03:30:00Z")
  expect(new Date(startOfDayIn("Asia/Karachi", now)).toISOString()).toBe("2026-09-24T19:00:00.000Z")
  expect(new Date(startOfDayIn("UTC", now)).toISOString()).toBe("2026-09-25T00:00:00.000Z")
  expect(new Date(startOfDayIn("Asia/Karachi", Date.parse("2026-09-24T18:59:59Z"))).toISOString()).toBe("2026-09-23T19:00:00.000Z")
  expect(new Date(startOfDayIn("Europe/London", Date.parse("2026-07-01T12:00:00Z"))).toISOString()).toBe("2026-06-30T23:00:00.000Z")
})

test("hours are the shop's local hours", () => {
  expect(hourIn("Asia/Karachi", Date.parse("2026-09-25T05:10:00Z"))).toBe(10)
  expect(hourIn("UTC", Date.parse("2026-09-25T05:10:00Z"))).toBe(5)
})

test("a picked date starts at that date's midnight, even far from UTC", () => {
  expect(new Date(startOfDateIn("Asia/Karachi", "2026-09-01")).toISOString()).toBe("2026-08-31T19:00:00.000Z")
  expect(new Date(startOfDateIn("Pacific/Kiritimati", "2026-09-01")).toISOString()).toBe("2026-08-31T10:00:00.000Z")
  expect(new Date(startOfDateIn("Pacific/Pago_Pago", "2026-09-01")).toISOString()).toBe("2026-09-01T11:00:00.000Z")
})
