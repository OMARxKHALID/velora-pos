export const MAX_REFERENCE = 30

export const referenceError = (value) => (value.trim().length > MAX_REFERENCE ? `Keep it under ${MAX_REFERENCE} characters` : null)

// Bank approval codes are meant to be unique. Point out a repeat so a typo or a reused slip gets noticed.
export const findSaleByReference = (sales, value) => {
  const reference = value.trim().toLowerCase()
  if (!reference) return null
  return sales.find(({ payments }) => payments.some((payment) => payment.reference?.toLowerCase() === reference)) ?? null
}
