import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/lib/session"
import { ProductsScreen } from "@/features/catalog/components/products-screen"
import { DemoReady } from "@/features/demo/components/demo-ready"

const ProductsPage = async () => {
  const user = await requireRole("admin", "manager")

  return (
    <>
      <PageHeader title="Products" description="The shoes Velora Shoes sells: prices, colours, sizes and barcodes." />
      <DemoReady>
        <ProductsScreen user={user} />
      </DemoReady>
    </>
  )
}

export default ProductsPage
