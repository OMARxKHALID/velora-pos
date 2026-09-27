import { PageHeaderSkeleton, RouteSkeleton, StockCountSkeleton } from "@/shared/components/ui/table-skeleton"

const StockCountLoading = () => (
  <RouteSkeleton>
    <PageHeaderSkeleton />
    <StockCountSkeleton />
  </RouteSkeleton>
)

export default StockCountLoading
