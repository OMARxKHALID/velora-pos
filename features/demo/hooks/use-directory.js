import { useCallback } from "react"
import { approverFor, staffName } from "../lib/staff"
import { useDemoStore } from "../store/demo-store-provider"

// Names come from the live team list so people added (or removed) in Staff read correctly everywhere.
export const useStaffName = () => {
  const staff = useDemoStore(({ staff }) => staff)
  return useCallback((id) => staffName(id, staff), [staff])
}

// Whoever currently holds the supervisor role is who approvals and returns are recorded against.
export const useApprover = () => approverFor(useDemoStore(({ staff }) => staff))
