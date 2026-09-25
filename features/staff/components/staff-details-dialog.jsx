"use client"

import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { timeAgo } from "@/lib/dates"
import { RoleBadge } from "./role-badge"
import { useShopNameOf } from "@/features/shops/hooks/use-shop-scope"
import { StaffAvatar } from "./staff-avatar"

const Fact = ({ label, children }) => (
  <div>
    <p className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
    <div className="mt-0.5 text-xs font-medium">{children}</div>
  </div>
)

const ShopName = ({ person }) => useShopNameOf()(person)

export const StaffDetailsDialog = ({ person, activity, onEdit, onTransfer, onRemove, onClose }) => (
  <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <StaffAvatar person={person} size="lg" className="size-12" fallbackClassName="text-base font-bold" />
          <div>
            <DialogTitle>{person.name}</DialogTitle>
            <DialogDescription className="mt-0.5 flex items-center gap-2">
              <RoleBadge role={person.role} />
              <span>
                <ShopName person={person} />
              </span>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-2 text-sm">
        <div className="grid grid-cols-2 gap-x-2 gap-y-3 border bg-muted/40 p-3">
          <Fact label="Email">
            <span className="block truncate">{person.email || "—"}</span>
          </Fact>
          <Fact label="Phone">{person.phone || "—"}</Fact>
          <Fact label="CNIC">{person.cnic || "—"}</Fact>
          <Fact label="City">{person.city || "—"}</Fact>
          <Fact label="Emergency contact">{person.emergencyContact || "—"}</Fact>
          <Fact label="Joined">{person.joinedAt}</Fact>
          {person.leave && (
            <div className="col-span-2">
              <Fact label="Leave">
                {person.leave.from} to {person.leave.until ?? "not set"}
                {person.leave.note && ` · ${person.leave.note}`}
              </Fact>
            </div>
          )}
          {person.address && (
            <div className="col-span-2">
              <Fact label="Address">{person.address}</Fact>
            </div>
          )}
          <Fact label="Last active">{activity.lastActive ? timeAgo(activity.lastActive) : "Never"}</Fact>
        </div>

        <div className="grid grid-cols-2 gap-3 border p-3">
          <Fact label="Sales handled">
            <span className="font-sans text-lg font-bold">{activity.sales}</span>
          </Fact>
          <Fact label="Shifts logged">
            <span className="font-sans text-lg font-bold">{activity.shifts}</span>
          </Fact>
        </div>

        {person.role !== "admin" && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Job role</p>
            <div className="flex gap-2">
              {[
                ["manager", "Supervisor"],
                ["cashier", "Cashier"],
              ].map(([role, label]) => (
                <Button key={role} size="sm" variant={person.role === role ? "default" : "outline"} className="flex-1" disabled={person.role === role} onClick={() => onTransfer(person, role)}>
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Cashiers process checkout. Supervisors manage stock, returns and the catalog. A new role applies the next time they sign in.
            </p>
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {person.role !== "admin" ? (
          <Button variant="destructive" size="sm" onClick={() => onRemove(person)}>
            <TrashIcon />
            Remove staff
          </Button>
        ) : (
          <div />
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(person)}>
            <PencilSimpleIcon />
            Edit profile
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
