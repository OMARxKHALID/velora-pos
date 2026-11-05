const dateTime = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
const FULL_DATE_TIME = { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }
const fullDateTime = new Intl.DateTimeFormat("en-PK", FULL_DATE_TIME)
const clock = new Intl.DateTimeFormat("en-PK", { hour: "numeric", minute: "2-digit" })
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export const DAY = 24 * 60 * 60 * 1000

export const formatDateTime = (at) => dateTime.format(new Date(at))

const formatTime = (at) => clock.format(new Date(at))

export const formatTimeOrDate = (at, now = Date.now()) => (new Date(at).toDateString() === new Date(now).toDateString() ? formatTime(at) : formatDateTime(at))

export const formatFullDateTime = (at, timeZone) =>
  (timeZone ? new Intl.DateTimeFormat("en-PK", { ...FULL_DATE_TIME, timeZone }) : fullDateTime).format(new Date(at))

export const timeAgo = (at) => {
  const minutes = Math.round((new Date(at).getTime() - Date.now()) / 60000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute")
  if (Math.abs(minutes) < 60 * 24) return relative.format(Math.round(minutes / 60), "hour")
  return relative.format(Math.round(minutes / (60 * 24)), "day")
}
