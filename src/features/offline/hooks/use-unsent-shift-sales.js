import { useEffect, useState } from "react"
import { liveQuery } from "dexie"
import { outboxFor } from "../lib/outbox"
import { tillDb } from "../lib/till-db"

export const useUnsentShiftSales = ({ id, cashierId }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const till = tillDb()
    if (!till) return
    const subscription = liveQuery(async () => (await outboxFor(till, cashierId)).filter(({ shiftId }) => shiftId === id).length).subscribe({
      next: setCount,
      error: () => setCount(0),
    })
    return () => subscription.unsubscribe()
  }, [id, cashierId])

  return count
}
