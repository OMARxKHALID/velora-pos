"use client"

import { cn } from "cn"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { surface } from "@/shared/components/ui/surface"
import { PAGE_SIZE } from "@/shared/components/ui/table-pagination"

export const skeletonAppear = "animate-in fade-in fill-mode-both delay-150 duration-300"

export const RouteSkeleton = ({ className, children }) => <div className={cn("flex min-w-0 flex-1 flex-col gap-6", skeletonAppear, className)}>{children}</div>

export const PageHeaderSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="h-8 w-44" />
    <Skeleton className="h-4 w-full max-w-80" />
  </div>
)

const TableRowsSkeleton = () => (
  <div className="divide-y">
    {Array.from({ length: PAGE_SIZE }, (_, index) => (
      <div key={index} className="flex items-center justify-between gap-4 p-2 @lg:p-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-48 max-w-full" />
        </div>
        <Skeleton className="h-4 w-20 shrink-0" />
      </div>
    ))}
  </div>
)

const StatStripSkeleton = () => (
  <div className={cn("grid grid-cols-2 @2xl:grid-cols-4", surface)}>
    {Array.from({ length: 4 }, (_, index) => (
      <div key={index} className="space-y-2 border-b px-4 py-3 odd:border-r @2xl:border-r @2xl:border-b-0 @2xl:last:border-r-0">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-24" />
      </div>
    ))}
  </div>
)

export const TablePageSkeleton = () => (
  <div role="status" aria-label="Loading" className="flex flex-col gap-6">
    <div className="flex flex-wrap items-center gap-2.5">
      <Skeleton className="h-10 w-full pointer-coarse:h-11 @xl:w-72" />
      <Skeleton className="h-9.5 w-48 max-w-full pointer-coarse:h-11.5" />
      <Skeleton className="h-9 w-full pointer-coarse:h-11 @2xl:ml-auto @2xl:w-40" />
    </div>
    <div className={surface}>
      <div className="flex h-10 items-center gap-6 border-b px-2 @lg:h-12 @lg:px-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="hidden h-3 w-24 @2xl:block" />
        <Skeleton className="ml-auto h-3 w-14" />
      </div>
      <TableRowsSkeleton />
      <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-32 pointer-coarse:h-11" />
      </div>
    </div>
  </div>
)

export const PanelsSkeleton = () => (
  <div role="status" aria-label="Loading" className="flex flex-col gap-6">
    <Skeleton className="h-9.5 w-full pointer-coarse:h-11.5 md:w-80" />
    <Skeleton className="h-51 @2xl:h-24" />
    <Skeleton className="h-89 @2xl:h-101" />
    <div className="grid gap-4 @4xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-64" />
      ))}
    </div>
  </div>
)

const tabWidths = ["w-12", "w-20", "w-16", "w-28", "w-14", "w-28"]

export const SettingsSkeleton = () => (
  <div role="status" aria-label="Loading" className="space-y-4">
    <Skeleton className="h-9 w-full" />
    <div className="flex gap-6 overflow-hidden border-b pb-3">
      {tabWidths.map((width, index) => (
        <Skeleton key={index} className={cn("h-4 shrink-0", width)} />
      ))}
    </div>
    <Skeleton className="h-4 w-full max-w-xl" />
    <div className="grid items-start gap-4 @4xl:grid-cols-2">
      <div className={surface}>
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="grid grid-cols-3 gap-4 border-b p-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-full max-w-64" />
          </div>
        </div>
        <div className="border-t px-4 py-3">
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  </div>
)

export const StockCountSkeleton = () => (
  <div role="status" aria-label="Loading" className="flex flex-col gap-6">
    <div className="flex flex-wrap items-center gap-2.5">
      <Skeleton className="h-11 w-full @xl:w-96" />
      <div className="flex w-full gap-2 @2xl:ml-auto @2xl:w-auto">
        <Skeleton className="h-9 flex-1 pointer-coarse:h-11 @2xl:w-20 @2xl:flex-none" />
        <Skeleton className="h-9 flex-1 pointer-coarse:h-11 @2xl:w-40 @2xl:flex-none" />
      </div>
    </div>
    <StatStripSkeleton />
    <Skeleton className="h-72" />
  </div>
)
