import { PageHeaderSkeleton, RouteSkeleton, TablePageSkeleton } from "@/shared/components/ui/table-skeleton"

const DashboardLoading = () => (
  <RouteSkeleton>
    <PageHeaderSkeleton />
    <TablePageSkeleton />
  </RouteSkeleton>
)

export default DashboardLoading
