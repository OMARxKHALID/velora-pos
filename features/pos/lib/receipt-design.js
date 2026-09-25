export const receiptDefaults = {
  title: "VELORA",
  footer: "Thank you for shopping at Velora",
  policy: "",
  paper: "80",
  showCashier: true,
  showCustomer: true,
  showBarcode: true,
}

export const receiptDesign = (settings) => ({ ...receiptDefaults, ...settings?.receipt })

export const receiptPaper = (design) => (design.paper === "58" ? "receipt-58" : "receipt")
