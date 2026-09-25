"use client"

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
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"

export const ConnectionStatus = () => {
  const offline = useLedgerStore(({ offline }) => offline)
  const loadError = useLedgerStore(({ loadError }) => loadError)
  const load = useLedgerStore(({ load }) => load)
  const trouble = offline || Boolean(loadError)
  const Icon = trouble ? CloudSlashIcon : WifiHighIcon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-7 items-center gap-1.5 border px-2 pointer-coarse:h-10 pointer-coarse:px-3 text-xs font-semibold tracking-widest whitespace-nowrap uppercase transition-colors",
          trouble ? "border-warning/40 bg-warning/10 text-warning" : "border-success/30 bg-success/10 text-success"
        )}
      >
        <Icon className="size-3.5" />
        {offline ? "Offline" : loadError ? "Not synced" : "Online"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal text-muted-foreground">
            {offline
              ? "No internet. Nothing can be saved until the connection is back."
              : loadError
                ? `The latest data could not be loaded: ${loadError}`
                : "Connected. Every change is saved on the server and shared with the other screens."}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => load()}>
          <ArrowsClockwiseIcon />
          Refresh now
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
