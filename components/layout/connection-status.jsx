"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { ArrowsClockwiseIcon, CloudSlashIcon, WifiHighIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"

const SYNC_DELAY = 1400

export const ConnectionStatus = () => {
  const hydrated = useDemoStore(({ hydrated }) => hydrated)
  const offline = useDemoStore(({ offline }) => offline)
  const waiting = useDemoStore(({ outbox }) => outbox.length)
  const setOffline = useDemoStore(({ setOffline }) => setOffline)
  const syncOutbox = useDemoStore(({ syncOutbox }) => syncOutbox)
  const syncing = hydrated && !offline && waiting > 0

  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOffline(true)
    }
    const handleOffline = () => setOffline(true)
    const handleOnline = () => setOffline(false)
    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
    }
  }, [setOffline])

  useEffect(() => {
    if (!syncing) return
    const timer = setTimeout(() => {
      const synced = syncOutbox()
      if (synced > 0) {
        toast.success(`${synced} offline ${synced === 1 ? "sale" : "sales"} synced`, { description: "Stock, reports and the dashboard are up to date." })
      }
    }, SYNC_DELAY)
    return () => clearTimeout(timer)
  }, [syncing, syncOutbox])

  const state = offline ? "offline" : syncing ? "syncing" : "online"
  const Icon = { offline: CloudSlashIcon, syncing: ArrowsClockwiseIcon, online: WifiHighIcon }[state]
  const label = { offline: waiting ? `Offline · ${waiting} waiting` : "Offline", syncing: `Syncing ${waiting}…`, online: "Online" }[state]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-7 items-center gap-1.5 border px-2 pointer-coarse:h-10 pointer-coarse:px-3 text-xs font-semibold tracking-widest whitespace-nowrap uppercase transition-colors",
          state === "online" && "border-success/30 bg-success/10 text-success",
          state === "offline" && "border-warning/40 bg-warning/10 text-warning",
          state === "syncing" && "border-info/40 bg-info/10 text-info"
        )}
      >
        <Icon className={cn("size-3.5", state === "syncing" && "animate-spin")} />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal text-muted-foreground">
            {offline
              ? "No internet. Sales are saved on this counter with a unique ID and sync automatically when the connection returns, never twice."
              : "Connected. Every sale is sent to the server as it happens."}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {waiting > 0 && (
          <DropdownMenuItem
            onClick={() => {
              setOffline(false)
              const synced = syncOutbox()
              if (synced > 0) {
                toast.success(`${synced} offline ${synced === 1 ? "sale" : "sales"} synced`, {
                  description: "Stock, reports and the dashboard are up to date.",
                })
              }
            }}
          >
            <ArrowsClockwiseIcon />
            Sync {waiting} pending {waiting === 1 ? "sale" : "sales"} now
          </DropdownMenuItem>
        )}
        {offline ? (
          <DropdownMenuItem onClick={() => setOffline(false)}>
            <WifiHighIcon />
            Reconnect
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => setOffline(true)}>
            <CloudSlashIcon />
            Simulate internet drop
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
