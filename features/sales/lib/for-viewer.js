export const withoutCosts = (sale) => ({ ...sale, items: sale.items.map(({ unitCost: _unitCost, ...item }) => item) })

export const saleForViewer = (viewer) => (sale) => (viewer.role === "cashier" ? withoutCosts(sale) : sale)
