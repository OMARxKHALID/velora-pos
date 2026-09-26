import { useState } from "react"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { shopRegisters } from "@/features/shops/lib/shops"

const COUNTER_KEY = "velora-counter"

const readSaved = () => {
  try {
    return window.localStorage.getItem(COUNTER_KEY)
  } catch {
    return null
  }
}

const save = (registerId) => {
  try {
    window.localStorage.setItem(COUNTER_KEY, registerId)
  } catch {
    return false
  }
  return true
}

export const useCounter = (user) => {
  const shopId = useShopScope(user)
  const allRegisters = useLedgerStore(({ registers }) => registers)
  const shifts = useLedgerStore(({ shifts }) => shifts)
  const [chosen, setChosen] = useState(() => (typeof window === "undefined" ? null : readSaved()))
  const registers = shopRegisters(allRegisters, shopId)
  const mine = shifts.find(({ status, cashierId, registerId }) => status === "open" && cashierId === user.id && registers.some(({ id }) => id === registerId))
  const register = registers.find(({ id }) => id === mine?.registerId) ?? registers.find(({ id }) => id === chosen) ?? registers[0] ?? null

  const choose = (registerId) => {
    save(registerId)
    setChosen(registerId)
  }

  return { shopId, register, registers, choose, locked: Boolean(mine) }
}
