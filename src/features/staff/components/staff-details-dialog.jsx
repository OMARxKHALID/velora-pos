"use client"

import { useState } from "react"
import { KeyIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { formatFullDateTime, timeAgo } from "@/shared/lib/dates"
import { RoleBadge } from "./role-badge"
import { useShopNameOf } from "@/features/shops/hooks/use-shop-scope"
import { StaffAvatar } from "./staff-avatar"

const Fact = ({ label, children }) => (
  <div>
    <p className="text-2xs font-semibold tracking-label text-muted-foreground uppercase">{label}</p>
    <div className="mt-0.5 text-xs font-medium">{children}</div>
  </div>
)

const AccountForm = ({ person, pending, onSaveAccount }) => {
  const [name, setName] = useState(person.name ?? "")
  const [username, setUsername] = useState(person.username ?? "")
  const [email, setEmail] = useState(person.email ?? "")
  const [password, setPassword] = useState("")
  const changed = name !== (person.name ?? "") || username !== (person.username ?? "") || email !== (person.email ?? "") || password
  const handleSubmit = async (event) => {
    event.preventDefault()
    const result = await onSaveAccount(person, { name, username, email, password })
    if (!result?.error) setPassword("")
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t pt-3">
      <p className="text-xs font-semibold tracking-label text-muted-foreground uppercase">Name and sign-in details</p>
      <div className="space-y-1.5">
        <Label htmlFor="account-name">Name</Label>
        <Input id="account-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" maxLength={60} required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="account-username">Username</Label>
          <Input id="account-username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="account-email">Email</Label>
          <Input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" placeholder="Optional" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="account-password">New password</Label>
        <Input id="account-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} placeholder="Leave empty to keep the current one" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">They can sign in with the username or the email. A new password signs them out on other devices.</p>
        <Button type="submit" size="sm" variant="outline" disabled={pending || !changed || (password && password.length < 8)}>
          <KeyIcon />
          Save
        </Button>
      </div>
    </form>
  )
}

const ShopName = ({ person }) => useShopNameOf()(person)

export const StaffDetailsDialog = ({ person, activity, pending, onEdit, onTransfer, onSaveAccount, onRemove, onClose }) => (
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
          <Fact label="Username">
            <span className="font-mono">{person.username}</span>
          </Fact>
          <Fact label="Access">{person.disabled ? "Turned off" : "Active"}</Fact>
          <Fact label="CNIC">{person.cnic || "—"}</Fact>
          <Fact label="City">{person.city || "—"}</Fact>
          <Fact label="Emergency contact">{person.emergencyContact || "—"}</Fact>
          <Fact label="Joined">{person.joinedAt ? formatFullDateTime(person.joinedAt) : "—"}</Fact>
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
            <span className="font-sans text-lg font-bold tabular-nums">{activity.sales}</span>
          </Fact>
          <Fact label="Shifts logged">
            <span className="font-sans text-lg font-bold tabular-nums">{activity.shifts}</span>
          </Fact>
        </div>

        {person.role !== "admin" && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold tracking-label text-muted-foreground uppercase">Job role</p>
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
        <AccountForm key={person.id} person={person} pending={pending} onSaveAccount={onSaveAccount} />
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
