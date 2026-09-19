"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useDemoStore } from "../store/demo-store-provider"

export const DemoReady = ({ children }) => {
  const hydrated = useDemoStore(({ hydrated }) => hydrated)

  if (!hydrated)
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    )

  return children
}
