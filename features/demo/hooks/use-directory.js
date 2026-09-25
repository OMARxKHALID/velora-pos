import { useCallback, useMemo } from "react"
import { activeStaff, staffName } from "../lib/staff"
import { useDemoStore } from "../store/demo-store-provider"

export const useStaffName = () => {
  const staff = useDemoStore(({ staff }) => staff)
  return useCallback((id) => staffName(id, staff), [staff])
}

export const useSupervisors = () => {
  const staff = useDemoStore(({ staff }) => staff)
  return useMemo(() => activeStaff(staff).filter(({ role }) => role === "manager"), [staff])
}
