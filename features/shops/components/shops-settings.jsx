"use client"

import { useState } from "react"
import { CashRegisterIcon, PencilSimpleIcon, PlusIcon, StorefrontIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Panel } from "@/features/analytics/components/panel"
import { StatusBadge } from "@/features/sales/components/sale-status-badges"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { ALL_SHOPS, shopRegisters } from "../lib/shops"
import { CounterDialog, ShopDialog } from "./shop-dialogs"

const Detail = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="truncate text-sm">{children || "—"}</dd>
  </div>
)

export const ShopsSettings = ({ scope = ALL_SHOPS }) => {
  const allShops = useDemoStore(({ shops }) => shops)
  const shops = scope === ALL_SHOPS ? allShops : allShops.filter(({ id }) => id === scope)
  const registers = useDemoStore(({ registers }) => registers)
  const shifts = useDemoStore(({ shifts }) => shifts)
  const [editingShop, setEditingShop] = useState(null)
  const [editingCounter, setEditingCounter] = useState(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">Every shop has its own products, stock, staff and counters. The owner sees them all together on the Overview.</p>
        {scope === ALL_SHOPS && (
          <Button size="sm" onClick={() => setEditingShop({ shop: null })}>
            <PlusIcon />
            New shop
          </Button>
        )}
      </div>

      <div className="grid items-start gap-4 @4xl:grid-cols-2">
        {shops.map((shop) => (
          <Panel
            key={shop.id}
            title={
              <span className="flex items-center gap-2">
                <StorefrontIcon className="size-4 text-gold" />
                {shop.name}
                <span className="font-mono text-xs font-normal text-muted-foreground">{shop.code}</span>
                {shop.active === false && <StatusBadge tone="muted">Closed</StatusBadge>}
              </span>
            }
            description={[shop.address, shop.city].filter(Boolean).join(", ") || "No address yet"}
            action={
              <Button size="sm" variant="ghost" onClick={() => setEditingShop({ shop })}>
                <PencilSimpleIcon />
                Edit
              </Button>
            }
          >
            <dl className="grid grid-cols-3 gap-3 border-b px-4 py-3">
              <Detail label="Phone">{shop.phone}</Detail>
              <Detail label="NTN">{shop.ntn}</Detail>
              <Detail label="STRN">{shop.strn}</Detail>
            </dl>
            <ul className="divide-y">
              {shopRegisters(registers, shop.id).map((register) => {
                const open = shifts.some(({ registerId, status }) => registerId === register.id && status === "open")
                return (
                  <li key={register.id} className="flex items-center gap-3 px-4 py-2.5">
                    <CashRegisterIcon className="size-5 shrink-0 text-gold" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {register.code} · {register.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        POSID {register.fbrPosId || "not set"} · {register.autoPrint ? `auto-print ${register.copies}×` : "print on request"} · drawer {register.drawerOnCash ? "opens on cash" : "manual"}
                      </span>
                    </span>
                    {open && <StatusBadge tone="info">Shift open</StatusBadge>}
                    <Button size="icon-sm" variant="ghost" aria-label={`Edit counter ${register.code}`} onClick={() => setEditingCounter({ shop, register })}>
                      <PencilSimpleIcon />
                    </Button>
                  </li>
                )
              })}
            </ul>
            <div className="border-t px-4 py-2.5">
              <Button size="sm" variant="outline" onClick={() => setEditingCounter({ shop, register: null })}>
                <PlusIcon />
                Add counter
              </Button>
            </div>
          </Panel>
        ))}
      </div>

      {editingShop && <ShopDialog shop={editingShop.shop} onClose={() => setEditingShop(null)} />}
      {editingCounter && <CounterDialog shop={editingCounter.shop} register={editingCounter.register} onClose={() => setEditingCounter(null)} />}
    </div>
  )
}
