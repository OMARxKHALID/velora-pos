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

export const sampleSale = (shopId, cashierId = "") => ({
  id: "sample",
  number: "SH1-R1-000123",
  shopId,
  cashierId,
  soldAt: Date.now(),
  syncedAt: Date.now(),
  items: [
    { variantId: "sample-1", productName: "Velora Runner", sku: "VS-01-BLACK-42", attributes: { color: "Black", size: "42" }, quantity: 1, unitPrice: 890000, productDiscount: 0, discount: 0, total: 890000 },
    { variantId: "sample-2", productName: "Velora Slide", sku: "VS-02-BROWN-41", attributes: { color: "Brown", size: "41" }, quantity: 2, unitPrice: 240000, productDiscount: 0, discount: 0, total: 480000 },
  ],
  subtotal: 1370000,
  discountTotal: 0,
  taxTotal: 0,
  taxRate: 0,
  taxInclusive: false,
  serviceFee: 0,
  cashRounding: 0,
  total: 1370000,
  payments: [{ method: "cash", amount: 1400000 }],
  change: 30000,
  fbr: null,
})
