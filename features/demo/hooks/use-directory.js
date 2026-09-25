import { useCallback } from "react"
import { staffName } from "../lib/staff"
import { useDemoStore } from "../store/demo-store-provider"

export const useStaffName = () => {
  const staff = useDemoStore(({ staff }) => staff)
  return useCallback((id) => staffName(id, staff), [staff])
}
