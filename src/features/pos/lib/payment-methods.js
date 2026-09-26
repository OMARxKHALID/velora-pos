export const METHOD_LABELS = { cash: "Cash", card: "Card", jazzcash: "JazzCash", easypaisa: "Easypaisa", bank: "Bank transfer" }

export const methodLabel = (method) => METHOD_LABELS[method] ?? method

const OTHER_METHODS = ["jazzcash", "easypaisa", "bank"]

export const enabledOtherMethods = (settings) => OTHER_METHODS.filter((method) => settings?.paymentMethods?.[method])

export const cardEnabled = (settings) => settings?.paymentMethods?.card !== false
