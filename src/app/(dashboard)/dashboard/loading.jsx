import { PageHeaderSkeleton, PanelsSkeleton, RouteSkeleton } from "@/shared/components/ui/table-skeleton"

const DashboardLoading = () => (
  <RouteSkeleton>
    <PageHeaderSkeleton />
    <PanelsSkeleton />
  </RouteSkeleton>
)

export default DashboardLoading
