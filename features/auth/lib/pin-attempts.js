const LIMIT = 5
const WINDOW = 5 * 60 * 1000

export const createAttemptLimiter = ({ limit = LIMIT, window = WINDOW } = {}) => {
  const failures = new Map()

  const recent = (key, now) => (failures.get(key) ?? []).filter((at) => now - at < window)

  return {
    blocked: (key, now = Date.now()) => recent(key, now).length >= limit,
    fail: (key, now = Date.now()) => failures.set(key, [...recent(key, now), now]),
    clear: (key) => failures.delete(key),
  }
}
