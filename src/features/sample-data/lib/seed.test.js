import { describe, expect, test } from "bun:test"
import { applyOpenShift, applyRefundDecision, expectedCash, openShiftFor, shiftSummary } from "@/features/ledger/lib/rules"
import { createSeed } from "./seed"

const at = (hours, minutes = 0) => new Date(2026, 8, 16, hours, minutes).getTime()

const startOfDay = (time) => new Date(time).setHours(0, 0, 0, 0)

describe("sample data", () => {
  test("there is something to show on Today from mid-morning onwards", () => {
    for (const [hours, minutes] of [[11, 30], [12, 0], [15, 0], [21, 30]]) {
      const now = at(hours, minutes)
      const today = createSeed(now).sales.filter(({ soldAt }) => soldAt >= startOfDay(now))
      expect(today.length, `${hours}:${minutes}`).toBeGreaterThan(0)
    }
  })

  test("nothing is stamped in the future, whatever time the sample data is reset", () => {
    for (const [hours, minutes] of [[10, 45], [12, 0], [15, 0], [23, 0]]) {
      const now = at(hours, minutes)
      const state = createSeed(now)
      const stamps = [
        ...state.sales.map(({ soldAt }) => soldAt),
        ...state.refunds.flatMap(({ createdAt, decidedAt }) => [createdAt, decidedAt ?? 0]),
        ...state.movements.map(({ createdAt }) => createdAt),
        ...state.shifts.flatMap(({ openedAt, closedAt }) => [openedAt, closedAt ?? 0]),
      ]
      expect(Math.max(...stamps), `${hours}:${minutes}`).toBeLessThanOrEqual(now)
    }
  })

  test("the seed builds on every day of the week and at any hour", () => {
    for (let day = 1; day <= 14; day += 1) {
      const now = new Date(2026, 8, day, (day * 5) % 24, 15).getTime()
      expect(() => createSeed(now), `day ${day}`).not.toThrow()
    }
  })

  test("the counter is free and some refunds are waiting for a decision", () => {
    const state = createSeed(at(15))
    expect(openShiftFor(state)).toBeUndefined()
    expect(state.refunds.filter(({ status }) => status === "pending").length).toBeGreaterThanOrEqual(2)
  })

  test("every closed shift reconciles, even after all pending refunds are decided", () => {
    let state = createSeed(at(15))
    for (const shift of state.shifts) expect(shiftSummary(state, shift).expectedCash).toBe(shift.expectedCash)
    state = applyOpenShift(state, { cashierId: "u-cashier", openingCash: 1000000, at: at(15, 30) }).state

    for (const refund of state.refunds.filter(({ status }) => status === "pending")) {
      state = applyRefundDecision(state, { refundId: refund.id, approve: true, userId: "u-manager", at: at(16) }).state
    }
    for (const shift of state.shifts.filter(({ status }) => status === "closed")) {
      expect(expectedCash(state, shift)).toBe(shift.expectedCash)
      expect(shiftSummary(state, shift).cashRefunds).toBe(state.refunds.filter(({ payoutShiftId, method }) => payoutShiftId === shift.id && method === "cash").reduce((sum, { total }) => sum + total, 0))
    }
  })
})
