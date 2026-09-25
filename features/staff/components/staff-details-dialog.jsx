"use client"

import { useState } from "react"
import { KeyIcon, TrashIcon } from "@phosphor-icons/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatFullDateTime, timeAgo } from "@/lib/dates"
import { RoleBadge } from "./role-badge"

const Fact = ({ label, children }) => (
  <div>
    <p className="text-2xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
    <div className="mt-0.5 text-xs font-medium">{children}</div>
  </div>
)

const PasswordForm = ({ person, pending, onSetPassword }) => {
  const [password, setPassword] = useState("")
  const handleSubmit = async (event) => {
    event.preventDefault()
    const result = await onSetPassword(person, password)
    if (!result?.error) setPassword("")
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-2 border-t pt-3">
      <label htmlFor="new-password" className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        New password
      </label>
      <div className="flex gap-2">
        <Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} />
        <Button type="submit" size="sm" variant="outline" disabled={pending || password.length < 8}>
          <KeyIcon />
          Set
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">At least 8 characters. They are signed out everywhere and use the new one next time.</p>
    </form>
  )
}

export const StaffDetailsDialog = ({ person, activity, pending, onTransfer, onSetPassword, onRemove, onClose }) => (
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
          <Fact label="Username">
            <span className="font-mono">{person.username}</span>
          </Fact>
          <Fact label="Access">{person.disabled ? "Turned off" : "Active"}</Fact>
          <Fact label="Joined">{person.joinedAt ? formatFullDateTime(person.joinedAt) : "—"}</Fact>
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
                <Button key={role} size="sm" variant={person.role === role ? "default" : "outline"} className="flex-1" disabled={pending || person.role === role} onClick={() => onTransfer(person, role)}>
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Cashiers process checkout. Supervisors manage stock, returns and the catalog. A new role applies straight away.
            </p>
          </div>
        )}
        {person.role !== "admin" && <PasswordForm person={person} pending={pending} onSetPassword={onSetPassword} />}
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
