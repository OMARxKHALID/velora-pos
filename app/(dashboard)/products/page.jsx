import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { ProductsScreen } from "@/features/catalog/components/products-screen"
import { LedgerReady } from "@/features/ledger/components/ledger-ready"

const ProductsPage = async () => {
  await requireRole("manager")

  return (
    <>
      <PageHeader title="Products" description="What the shop sells, with prices, colours and sizes." />
      <LedgerReady>
        <ProductsScreen />
      </LedgerReady>
    </>
  )
}

export default ProductsPage
