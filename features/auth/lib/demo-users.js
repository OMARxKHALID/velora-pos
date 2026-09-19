export const demoUsers = {
  admin: { id: "u-admin", name: "Ayesha Khan", role: "admin", title: "Owner · Velora Group", shopId: null },
  manager: { id: "u-manager", name: "Bilal Ahmed", role: "manager", title: "Manager · Velora Shoes", shopId: "shop-shoes" },
  cashier: { id: "u-cashier", name: "Hamza Ali", role: "cashier", title: "Cashier · Counter 1", shopId: "shop-shoes" },
}

export const homeFor = (role) => (role === "cashier" ? "/pos" : "/dashboard")
