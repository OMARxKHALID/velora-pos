const dateTime = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
const fullDateTime = new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" })
const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export const DAY = 24 * 60 * 60 * 1000

export const formatDateTime = (at) => dateTime.format(new Date(at))

export const formatFullDateTime = (at) => fullDateTime.format(new Date(at))

export const startOfToday = () => new Date().setHours(0, 0, 0, 0)

export const timeAgo = (at) => {
  const minutes = Math.round((new Date(at).getTime() - Date.now()) / 60000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute")
  if (Math.abs(minutes) < 60 * 24) return relative.format(Math.round(minutes / 60), "hour")
  return relative.format(Math.round(minutes / (60 * 24)), "day")
}
