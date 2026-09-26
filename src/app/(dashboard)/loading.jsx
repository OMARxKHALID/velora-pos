"use client"

import { Skeleton } from "@/shared/components/ui/skeleton"
import { TablePageSkeleton } from "@/shared/components/ui/table-skeleton"

const DashboardLoading = () => (
  <>
    <div className="space-y-2">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-4 w-full max-w-80" />
    </div>
    <TablePageSkeleton />
  </>
)

export default DashboardLoading
