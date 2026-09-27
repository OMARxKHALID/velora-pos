import { useSearchParams } from "next/navigation"
import { customRangeError } from "../lib/analytics"

const RANGES = ["today", "7d", "30d", "custom"]
const DEFAULT_RANGE = "7d"
const NO_PARAMS = new URLSearchParams()

export const useDashboardPeriod = () => {
  const params = useSearchParams() ?? NO_PARAMS
  const asked = params.get("range")
  const range = RANGES.includes(asked) ? asked : DEFAULT_RANGE
  const from = params.get("from") ?? ""
  const to = params.get("to") ?? ""
  const error = range === "custom" ? customRangeError(from, to) : null

  const update = (changes) => {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(changes)) value ? next.set(key, value) : next.delete(key)
    const search = next.toString()
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname)
  }

  const selectRange = (key) => update({ range: key === DEFAULT_RANGE ? null : key, from: null, to: null })
  const selectDates = (dates) => update({ range: "custom", ...dates })

  return { range, from, to, error, selectRange, selectDates }
}
