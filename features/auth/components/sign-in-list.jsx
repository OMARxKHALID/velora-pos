"use client"

import { useMemo, useSyncExternalStore } from "react"
import { ArrowRightIcon, CashRegisterIcon, CrownIcon, ProhibitIcon, UserGearIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { initialStaff } from "@/features/demo/lib/staff"
import { signIn } from "../actions"
import { ROLES, roleBlurbs, roleLabels } from "../lib/demo-users"
import { parsePersistedStaff, readPersistedStaffRaw } from "../lib/persisted-staff"

const icons = { admin: CrownIcon, manager: UserGearIcon, cashier: CashRegisterIcon }

const subscribe = (onChange) => {
  window.addEventListener("storage", onChange)
  return () => window.removeEventListener("storage", onChange)
}

const roleOrder = (role) => ROLES.indexOf(role)

export const SignInList = ({ disabled }) => {
  const raw = useSyncExternalStore(subscribe, readPersistedStaffRaw, () => null)
  const people = useMemo(
    () => [...(parsePersistedStaff(raw) ?? Object.values(initialStaff))].sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || a.name.localeCompare(b.name)),
    [raw]
  )

  return (
    <div className="space-y-3">
      {people.map(({ id, name, role }) => {
        const off = disabled.includes(id)
        const Icon = icons[role]
        return (
          <form key={id} action={signIn}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="name" value={name} />
            <input type="hidden" name="role" value={role} />
            <button
              type="submit"
              disabled={off}
              className={cn(
                "group flex w-full min-w-0 items-center gap-3 sm:gap-4 border bg-card p-3 sm:p-4 text-left transition-colors touch-manipulation",
                off ? "cursor-not-allowed opacity-50" : "hover:border-primary active:scale-[0.98]"
              )}
            >
              <span className="flex size-10 sm:size-11 shrink-0 items-center justify-center border border-primary/40 text-gold">
                {off ? <ProhibitIcon className="size-5 text-destructive" /> : <Icon className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs sm:text-sm font-semibold tracking-wider sm:tracking-widest uppercase truncate">{roleLabels[role]}</span>
                <span className="block line-clamp-2 text-xs text-muted-foreground">
                  {name} · {off ? "Access turned off" : roleBlurbs[role]}
                </span>
              </span>
              {!off && <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-gold" />}
            </button>
          </form>
        )
      })}
    </div>
  )
}
