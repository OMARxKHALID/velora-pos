import { PageHeader } from "@/components/layout/page-header"
import { requireRole } from "@/features/auth/server/session"
import { ProductsScreen } from "@/features/catalog/components/products-screen"
import { DemoReady } from "@/features/demo/components/demo-ready"

const ProductsPage = async () => {
  const user = await requireRole("manager")

  return (
    <>
      <PageHeader title="Products" description="What the shop sells, with prices, colours and sizes." />
      <DemoReady>
        <ProductsScreen user={user} />
      </DemoReady>
    </>
  )
}

export default ProductsPage
