export class AccessDenied extends Error {
  expose = true
}

export class UserError extends Error {
  expose = true
}

export const parseInput = (schema, value) => {
  const result = schema.safeParse(value)
  if (!result.success) throw new UserError(result.error.issues[0].message)
  return result.data
}
