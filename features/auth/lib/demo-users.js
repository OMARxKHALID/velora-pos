export const SHOP_NAME = "Shoe Shop"

export const roleLabels = { admin: "Owner", manager: "Supervisor", cashier: "Cashier" }

export const demoUsers = {
  admin: { id: "u-admin", name: "Ayesha Khan", role: "admin", title: "Owner · Velora Group", shopId: null },
  manager: { id: "u-manager", name: "Bilal Ahmed", role: "manager", title: `Supervisor · ${SHOP_NAME}`, shopId: "shop-shoes" },
  cashier: { id: "u-cashier", name: "Hamza Ali", role: "cashier", title: `Cashier · ${SHOP_NAME}`, shopId: "shop-shoes" },
}

export const homeFor = (role) => (role === "admin" ? "/dashboard" : "/pos")
