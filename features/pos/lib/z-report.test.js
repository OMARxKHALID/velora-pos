import { expect, test } from "bun:test"
import { parseCsv } from "@/lib/csv"
import { createSeed } from "@/features/demo/lib/seed"
import { shiftSummary } from "@/features/demo/lib/ledger"
import { generateZReportCsv } from "./z-report"

test("the Z-report CSV carries the shift's totals and every sale", () => {
  const state = createSeed()
  const shift = state.shifts.findLast(({ status }) => status === "closed")
  const summary = shiftSummary(state, shift)
  const rows = parseCsv(generateZReportCsv(state, shift, {}))
  const value = (label) => rows.find(([first]) => first === label)?.[1]
  const receipts = new Set(rows.map(([first]) => first))

  expect(value("Total Transactions")).toBe(String(summary.saleCount))
  expect(value("Total Collected (PKR)")).toBe((summary.revenue / 100).toFixed(2))
  expect(value("Expected Cash In Drawer")).toBe((shift.expectedCash / 100).toFixed(2))
  expect(value("Cash Variance (Over / Short)")).toBe((shift.difference / 100).toFixed(2))
  expect(state.sales.filter(({ shiftId }) => shiftId === shift.id).every(({ number }) => receipts.has(number))).toBe(true)
})
