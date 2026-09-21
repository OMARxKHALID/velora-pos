"use client"

import { TrashIcon } from "@phosphor-icons/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { timeAgo } from "@/lib/dates"
import { RoleBadge } from "./role-badge"

const Fact = ({ label, children }) => (
  <div>
    <p className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
    <div className="mt-0.5 text-xs font-medium">{children}</div>
  </div>
)

export const StaffDetailsDialog = ({ person, activity, onTransfer, onRemove, onClose }) => (
  <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            <AvatarFallback className="text-base font-bold">{person.avatar || person.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <DialogTitle>{person.name}</DialogTitle>
            <DialogDescription className="mt-0.5 flex items-center gap-2">
              <RoleBadge role={person.role} />
              <span>{person.shop}</span>
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
          <Fact label="Joined">{person.joinedAt}</Fact>
          <Fact label="Last active">{activity.lastActive ? timeAgo(activity.lastActive) : "Never"}</Fact>
        </div>

        <div className="grid grid-cols-2 gap-3 border p-3">
          <Fact label="Sales handled">
            <span className="font-heading text-lg font-bold">{activity.sales}</span>
          </Fact>
          <Fact label="Shifts logged">
            <span className="font-heading text-lg font-bold">{activity.shifts}</span>
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
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
