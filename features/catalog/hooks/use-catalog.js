import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { indexCatalog } from "../lib/catalog"

export const useCatalog = () => {
  const products = useDemoStore(({ products }) => products)
  const variants = useDemoStore(({ variants }) => variants)
  return { products, variants, ...indexCatalog({ products, variants }) }
}
