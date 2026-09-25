"use client"

import { useMemo, useSyncExternalStore } from "react"
import { ArrowRightIcon, CashRegisterIcon, CrownIcon, ProhibitIcon, UserGearIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { initialStaff, isOnLeave, worksAtClosedShop } from "@/features/demo/lib/staff"
import { signIn } from "../actions"
import { ROLES, roleBlurbs, roleLabels } from "../lib/demo-users"
import { parsePersistedShops, parsePersistedStaff, readPersistedStaffRaw } from "../lib/persisted-staff"

const icons = { admin: CrownIcon, manager: UserGearIcon, cashier: CashRegisterIcon }

const subscribe = (onChange) => {
  window.addEventListener("storage", onChange)
  return () => window.removeEventListener("storage", onChange)
}

const roleOrder = (role) => ROLES.indexOf(role)

const initialsOf = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")

export const SignInList = ({ disabled }) => {
  const raw = useSyncExternalStore(subscribe, readPersistedStaffRaw, () => null)
  const people = useMemo(
    () => [...(parsePersistedStaff(raw) ?? Object.values(initialStaff))].sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || a.name.localeCompare(b.name)),
    [raw]
  )
  const shops = useMemo(() => parsePersistedShops(raw), [raw])

  return (
    <div className="space-y-3">
      {people.map((person) => {
        const { id, name, role, avatar } = person
        const away = isOnLeave(person)
        const closed = worksAtClosedShop(person, shops)
        const off = disabled.includes(id) || away || closed
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
              <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground ring-1 ring-primary/40 sm:size-12">
                {off ? <ProhibitIcon className="size-5 text-destructive" /> : avatar || initialsOf(name)}
                {!off && (
                  <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border bg-card text-gold">
                    <Icon className="size-3" />
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate text-sm font-semibold sm:text-base">{name}</span>
                  <span className="shrink-0 text-xs text-gold">{roleLabels[role]}</span>
                </span>
                <span className="block line-clamp-2 text-xs text-muted-foreground">{away ? `On leave${person.leave.until ? ` until ${person.leave.until}` : ""}` : closed ? "Their shop is closed" : off ? "Access turned off" : roleBlurbs[role]}</span>
              </span>
              {!off && <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-gold" />}
            </button>
          </form>
        )
      })}
    </div>
  )
}
