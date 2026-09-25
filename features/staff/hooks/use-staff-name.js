import { useCallback } from "react"
import { staffName } from "../lib/people"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"

export const useStaffName = () => {
  const staff = useLedgerStore(({ staff }) => staff)
  return useCallback((id) => staffName(id, staff), [staff])
}
