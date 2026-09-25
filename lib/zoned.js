export const SHOP_TIME_ZONE = "Asia/Karachi"

const formatters = new Map()

const partsIn = (timeZone, at) => {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    )
  }
  return Object.fromEntries(
    formatters
      .get(timeZone)
      .formatToParts(new Date(at))
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)])
  )
}

const offsetAt = (timeZone, at) => {
  const { year, month, day, hour, minute, second } = partsIn(timeZone, at)
  return Date.UTC(year, month - 1, day, hour, minute, second) - Math.floor(at / 1000) * 1000
}

export const startOfDayIn = (timeZone, now) => {
  const { year, month, day } = partsIn(timeZone, now)
  const midnightAsUtc = Date.UTC(year, month - 1, day)
  return midnightAsUtc - offsetAt(timeZone, midnightAsUtc - offsetAt(timeZone, midnightAsUtc))
}

export const hourIn = (timeZone, at) => partsIn(timeZone, at).hour
