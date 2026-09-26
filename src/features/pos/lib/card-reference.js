export const MAX_REFERENCE = 30

export const referenceError = (value) => (value.trim().length > MAX_REFERENCE ? `Keep it under ${MAX_REFERENCE} characters` : null)
