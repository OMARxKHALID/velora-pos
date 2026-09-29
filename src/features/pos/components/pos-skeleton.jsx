import { Skeleton } from "@/shared/components/ui/skeleton"

export const screenHeight = "h-[calc(100dvh-var(--app-header-h)-2*var(--app-page-pad))] min-h-[34rem]"

const chipWidths = ["w-12", "w-20", "w-16", "w-24", "w-14", "w-20"]

export const PosSkeleton = () => (
  <div role="status" aria-label="Loading" className={`flex flex-col gap-3 ${screenHeight}`}>
    <div className="flex h-11 items-center gap-5 border bg-card px-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="ml-auto h-7 w-24" />
      <Skeleton className="hidden h-7 w-28 lg:block" />
    </div>
    <div className="flex min-h-0 flex-1 gap-3">
      <div className="@container flex min-h-0 min-w-0 flex-1 flex-col gap-2.5">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-1.5 overflow-hidden">
          {chipWidths.map((width, index) => (
            <Skeleton key={index} className={`h-7 shrink-0 pointer-coarse:h-10 ${width}`} />
          ))}
        </div>
        <div className="flex gap-1.5 overflow-hidden">
          {chipWidths.slice(0, 5).map((width, index) => (
            <Skeleton key={index} className={`h-7 shrink-0 pointer-coarse:h-10 ${width}`} />
          ))}
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-2 gap-2 overflow-hidden @sm:grid-cols-3 @xl:grid-cols-4 @3xl:grid-cols-5 @5xl:grid-cols-6">
          {Array.from({ length: 18 }, (_, index) => (
            <div key={index} className="flex flex-col border bg-card">
              <Skeleton className="h-12 bg-muted/70" />
              <div className="space-y-2 p-2.5">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden w-[340px] shrink-0 flex-col border bg-card lg:flex">
        <div className="space-y-2.5 border-b p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-9 w-20" />
          </div>
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="flex-1" />
        <div className="space-y-3 border-t p-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 border bg-card p-2 lg:hidden">
      <Skeleton className="size-11 shrink-0" />
      <div className="flex-1 space-y-1.5 px-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="h-12 w-24 shrink-0" />
    </div>
  </div>
)
