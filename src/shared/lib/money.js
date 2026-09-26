const pkr = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 })

export const formatMoney = (paisa) => pkr.format(paisa / 100)

export const toPaisa = (rupees) => Math.round(Number(rupees) * 100)

export const roundToRupee = (paisa) => Math.round(paisa / 100) * 100

export const sumBy = (list, pick) => list.reduce((total, item) => total + pick(item), 0)
