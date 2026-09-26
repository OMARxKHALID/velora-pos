import { Skeleton } from "@/shared/components/ui/skeleton"
import { PAGE_SIZE } from "@/shared/components/ui/table-pagination"

export const PanelsSkeleton = () => (
  <div role="status" aria-label="Loading" className="space-y-3">
    <Skeleton className="h-20" />
    <Skeleton className="h-96" />
  </div>
)

export const TablePageSkeleton = () => (
  <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-9 w-full max-w-72" />
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-9 w-28 @2xl:ml-auto" />
    </div>
    <div className="border bg-card">
      <TableSkeleton label="Loading" />
    </div>
  </div>
)

export const TableSkeleton = ({ rows = PAGE_SIZE, label }) => (
  <div role="status" aria-label={label} className="divide-y">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="flex items-center justify-between gap-4 px-3 py-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-48 max-w-full" />
        </div>
        <Skeleton className="h-4 w-20 shrink-0" />
      </div>
    ))}
  </div>
)
