import { RouteSkeleton } from "@/shared/components/ui/table-skeleton"
import { PosSkeleton } from "@/features/pos/components/pos-skeleton"

const PosLoading = () => (
  <RouteSkeleton>
    <PosSkeleton />
  </RouteSkeleton>
)

export default PosLoading
