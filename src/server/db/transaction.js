const TRANSACTION_OPTIONS = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
}

export const withTransaction = (client, work, options = {}) =>
  client.withSession((session) => session.withTransaction(() => work(session), { ...TRANSACTION_OPTIONS, ...options }))

export const isDuplicateKey = (error) => error?.code === 11000
