import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { indexCatalog } from "../lib/catalog"

export const useCatalog = () => {
  const products = useLedgerStore(({ products }) => products)
  const variants = useLedgerStore(({ variants }) => variants)
  return { products, variants, ...indexCatalog({ products, variants }) }
}
