export const staff = {
  "u-admin": { id: "u-admin", name: "Ayesha Khan", role: "admin" },
  "u-manager": { id: "u-manager", name: "Bilal Ahmed", role: "manager" },
  "u-cashier": { id: "u-cashier", name: "Hamza Ali", role: "cashier" },
  "u-cashier-2": { id: "u-cashier-2", name: "Sana Tariq", role: "cashier" },
}

export const staffName = (id) => staff[id]?.name ?? "Unknown"
