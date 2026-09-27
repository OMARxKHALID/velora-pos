import { RouteSkeleton } from "@/shared/components/ui/table-skeleton"
import { PosSkeleton } from "@/features/pos/components/pos-screen"

const PosLoading = () => (
  <RouteSkeleton>
    <PosSkeleton />
  </RouteSkeleton>
)

export default PosLoading
