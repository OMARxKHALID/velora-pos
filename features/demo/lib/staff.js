export const initialStaff = {
  "u-admin": {
    id: "u-admin",
    name: "Ayesha Khan",
    role: "admin",
    email: "ayesha.khan@velora.pk",
    phone: "0300 8412910",
    shop: "Head Office",
    joinedAt: "15 Jan 2024",
    avatar: "AK",
  },
  "u-manager": {
    id: "u-manager",
    name: "Bilal Ahmed",
    role: "manager",
    email: "bilal.ahmed@velora.pk",
    phone: "0321 4589201",
    shop: "Shoe Shop",
    joinedAt: "01 Jun 2024",
    avatar: "BA",
  },
  "u-cashier": {
    id: "u-cashier",
    name: "Hamza Ali",
    role: "cashier",
    email: "hamza.ali@velora.pk",
    phone: "0333 9128374",
    shop: "Shoe Shop",
    joinedAt: "10 Jan 2025",
    avatar: "HA",
  },
}

export const staff = initialStaff

export const staffName = (id, customStaff = staff) => customStaff?.[id]?.name ?? staff[id]?.name ?? "Unknown"
