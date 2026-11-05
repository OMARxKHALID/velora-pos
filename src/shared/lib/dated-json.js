const DATE_FIELDS = new Set(["soldAt", "syncedAt", "createdAt", "updatedAt", "decidedAt", "openedAt", "closedAt", "receivedAt", "parkedAt", "reportedAt", "at"])

export const parseDatedJson = (text) => JSON.parse(text, (key, value) => (DATE_FIELDS.has(key) && typeof value === "string" ? Date.parse(value) : value))
