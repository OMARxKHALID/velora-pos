import { PageHeaderSkeleton, RouteSkeleton, SettingsSkeleton } from "@/shared/components/ui/table-skeleton"

const SettingsLoading = () => (
  <RouteSkeleton>
    <PageHeaderSkeleton />
    <SettingsSkeleton />
  </RouteSkeleton>
)

export default SettingsLoading
