"use client"

import { ArrowsClockwiseIcon, CloudArrowUpIcon, CloudSlashIcon, WifiHighIcon } from "@phosphor-icons/react"
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
import { timeAgo } from "@/lib/dates"

export const ConnectionStatus = () => {
  const offline = useLedgerStore(({ offline }) => offline)
  const loadError = useLedgerStore(({ loadError }) => loadError)
  const load = useLedgerStore(({ load }) => load)
  const canSellOffline = useLedgerStore(({ canSellOffline }) => canSellOffline)
  const waiting = useLedgerStore(({ pending }) => pending.length)
  const savedAt = useLedgerStore(({ savedAt }) => savedAt)
  const syncOutbox = useLedgerStore(({ syncOutbox }) => syncOutbox)
  const trouble = offline || Boolean(loadError) || waiting > 0
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
        {offline ? "Offline" : loadError ? "Not synced" : waiting ? `${waiting} to upload` : "Online"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal text-muted-foreground">
            {offline
              ? canSellOffline
                ? "No internet. Sales are saved on this till and upload when the connection is back. Everything else waits for the connection."
                : "No internet. Nothing can be saved until the connection is back."
              : loadError
                ? `The latest data could not be loaded: ${loadError}`
                : "Connected. Every change is saved on the server and shared with the other screens."}
          </DropdownMenuLabel>
          {savedAt && <DropdownMenuLabel className="font-normal text-muted-foreground">Showing what this till saved {timeAgo(savedAt)}.</DropdownMenuLabel>}
          {waiting > 0 && (
            <DropdownMenuLabel className="font-normal text-info">
              {waiting} {waiting === 1 ? "sale is" : "sales are"} saved on this till, waiting to upload.
            </DropdownMenuLabel>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {waiting > 0 && (
          <DropdownMenuItem disabled={offline} onClick={() => syncOutbox()}>
            <CloudArrowUpIcon />
            Upload now
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => load()}>
          <ArrowsClockwiseIcon />
          Refresh now
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
