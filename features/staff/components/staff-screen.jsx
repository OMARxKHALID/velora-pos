"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { cn } from "cn"
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  EnvelopeSimpleIcon,
  InfoIcon,
  LockKeyIcon,
  PhoneIcon,
  StorefrontIcon,
  TrashIcon,
  UserIcon,
  UserSwitchIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { setStaffAccess } from "@/features/auth/actions"
import { roleLabels } from "@/features/auth/lib/demo-users"
import { initialStaff } from "@/features/demo/lib/staff"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { timeAgo } from "@/lib/dates"

const roleBadgeColors = {
  admin: "border-gold/40 bg-gold/10 text-gold",
  manager: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  cashier: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
}

const latest = (list) => list.reduce((max, at) => Math.max(max, new Date(at).getTime()), 0)

export const StaffScreen = ({ disabled: initial = [] }) => {
  const staff = useDemoStore(({ staff }) => staff || initialStaff)
  const sales = useDemoStore(({ sales }) => sales)
  const shifts = useDemoStore(({ shifts }) => shifts)
  const movements = useDemoStore(({ movements }) => movements)
  const transferStaffRole = useDemoStore(({ transferStaffRole }) => transferStaffRole)
  const removeStaff = useDemoStore(({ removeStaff }) => removeStaff)

  const [disabled, setDisabled] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [selectedUser, setSelectedUser] = useState(null)
  const [removingUser, setRemovingUser] = useState(null)

  const people = Object.values(staff)

  const getLastActive = (id) =>
    latest([
      ...sales.filter(({ cashierId }) => cashierId === id).map(({ soldAt }) => soldAt),
      ...shifts.filter(({ cashierId }) => cashierId === id).map(({ closedAt, openedAt }) => closedAt ?? openedAt),
      ...movements.filter(({ userId }) => userId === id).map(({ createdAt }) => createdAt),
    ])

  const getSalesCount = (id) => sales.filter(({ cashierId }) => cashierId === id).length
  const getShiftsCount = (id) => shifts.filter(({ cashierId }) => cashierId === id).length

  const handleToggleAccess = (person) => {
    const enable = disabled.includes(person.id)
    startTransition(async () => {
      const result = await setStaffAccess(person.id, enable)
      if (result.error) return toast.error(result.error)
      setDisabled(result.disabled)
      toast.success(enable ? "Access restored" : "Access turned off", {
        description: enable
          ? `${person.name} can sign in again.`
          : `${person.name} is signed out and cannot sign in.`,
      })
    })
  }

  const handleTransferRole = (person, newRole) => {
    try {
      transferStaffRole(person.id, newRole)
      toast.success("Role transferred", {
        description: `${person.name} is now ${roleLabels[newRole]}.`,
      })
      if (selectedUser?.id === person.id) {
        setSelectedUser({ ...person, role: newRole })
      }
    } catch (err) {
      toast.error(err.message || "Failed to transfer role")
    }
  }

  const handleConfirmRemove = () => {
    if (!removingUser) return
    try {
      removeStaff(removingUser.id)
      toast.success("Staff member removed", {
        description: `${removingUser.name} has been removed from the roster.`,
      })
      if (selectedUser?.id === removingUser.id) setSelectedUser(null)
      setRemovingUser(null)
    } catch (err) {
      toast.error(err.message || "Failed to remove staff member")
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border bg-card p-4">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Total staff</p>
          <p className="mt-1 font-heading text-2xl font-bold">{people.length}</p>
        </div>
        <div className="border bg-card p-4">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Supervisors</p>
          <p className="mt-1 font-heading text-2xl font-bold">{people.filter((p) => p.role === "manager").length}</p>
        </div>
        <div className="border bg-card p-4">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Cashiers</p>
          <p className="mt-1 font-heading text-2xl font-bold">{people.filter((p) => p.role === "cashier").length}</p>
        </div>
        <div className="border bg-card p-4">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Access disabled</p>
          <p className="mt-1 font-heading text-2xl font-bold text-destructive">
            {people.filter((p) => disabled.includes(p.id)).length}
          </p>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Staff member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((person) => {
              const off = disabled.includes(person.id)
              const seen = getLastActive(person.id)
              const isOwner = person.role === "admin"

              return (
                <TableRow key={person.id} className="group hover:bg-accent/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="default">
                        <AvatarFallback className="font-semibold">{person.avatar || person.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className={cn("truncate font-medium text-foreground", off && "text-muted-foreground line-through")}>
                          {person.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">Joined {person.joinedAt || "2024"}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-none border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase",
                        roleBadgeColors[person.role] || "border-border text-foreground"
                      )}
                    >
                      {roleLabels[person.role] || person.role}
                    </span>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {person.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <EnvelopeSimpleIcon className="size-3.5 shrink-0" />
                          <span className="truncate">{person.email}</span>
                        </div>
                      )}
                      {person.phone && (
                        <div className="flex items-center gap-1.5 truncate">
                          <PhoneIcon className="size-3.5 shrink-0" />
                          <span>{person.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <StorefrontIcon className="size-3.5 shrink-0" />
                      <span>{person.shop || "Shoe Shop"}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {seen ? timeAgo(seen) : "Never"}
                  </TableCell>

                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase",
                        off ? "text-destructive" : "text-success"
                      )}
                    >
                      <span className={cn("size-1.5 rounded-full", off ? "bg-destructive" : "bg-success")} />
                      {off ? "Disabled" : "Active"}
                    </span>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSelectedUser(person)}
                        title="View profile & activity"
                      >
                        <InfoIcon />
                        <span className="hidden lg:inline">Details</span>
                      </Button>

                      {!isOwner ? (
                        <>
                          <Button
                            size="xs"
                            variant={off ? "default" : "outline"}
                            disabled={pending}
                            onClick={() => handleToggleAccess(person)}
                          >
                            {off ? "Turn on" : "Turn off"}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={<Button size="icon-xs" variant="ghost" aria-label="More actions" />}
                            >
                              <DotsThreeVerticalIcon />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel>Role management</DropdownMenuLabel>
                              {person.role === "cashier" && (
                                <DropdownMenuItem onClick={() => handleTransferRole(person, "manager")}>
                                  <UserSwitchIcon className="mr-2 size-4" />
                                  Transfer to Supervisor
                                </DropdownMenuItem>
                              )}
                              {person.role === "manager" && (
                                <DropdownMenuItem onClick={() => handleTransferRole(person, "cashier")}>
                                  <UserSwitchIcon className="mr-2 size-4" />
                                  Transfer to Cashier
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setRemovingUser(person)}
                              >
                                <TrashIcon className="mr-2 size-4" />
                                Remove from staff
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ) : (
                        <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                          Permanent
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile / Tablet Responsive Cards View */}
      <div className="grid gap-3 md:hidden">
        {people.map((person) => {
          const off = disabled.includes(person.id)
          const seen = getLastActive(person.id)
          const isOwner = person.role === "admin"

          return (
            <div key={person.id} className="border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar size="default">
                    <AvatarFallback className="font-semibold">{person.avatar || person.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className={cn("font-medium text-foreground", off && "text-muted-foreground line-through")}>
                      {person.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-none border px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase",
                          roleBadgeColors[person.role] || "border-border text-foreground"
                        )}
                      >
                        {roleLabels[person.role] || person.role}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase",
                          off ? "text-destructive" : "text-success"
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", off ? "bg-destructive" : "bg-success")} />
                        {off ? "Disabled" : "Active"}
                      </span>
                    </div>
                  </div>
                </div>

                <Button size="icon-xs" variant="ghost" onClick={() => setSelectedUser(person)} aria-label="View user profile">
                  <InfoIcon />
                </Button>
              </div>

              {/* Contact info */}
              <div className="border-t pt-2 space-y-1 text-xs text-muted-foreground">
                {person.email && (
                  <div className="flex items-center gap-2">
                    <EnvelopeSimpleIcon className="size-3.5 shrink-0" />
                    <span className="truncate">{person.email}</span>
                  </div>
                )}
                {person.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="size-3.5 shrink-0" />
                    <span>{person.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground">
                  <span>{person.shop || "Shoe Shop"}</span>
                  <span>Active: {seen ? timeAgo(seen) : "Never"}</span>
                </div>
              </div>

              {/* Actions */}
              {!isOwner ? (
                <div className="flex items-center gap-2 border-t pt-3">
                  <Button
                    size="sm"
                    variant={off ? "default" : "outline"}
                    className="flex-1 touch-manipulation pointer-coarse:h-10"
                    disabled={pending}
                    onClick={() => handleToggleAccess(person)}
                  >
                    {off ? "Turn on access" : "Turn off access"}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          size="sm"
                          variant="outline"
                          className="touch-manipulation pointer-coarse:h-10"
                          aria-label="Staff options"
                        />
                      }
                    >
                      <DotsThreeVerticalIcon />
                      <span>Role</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel>Role transfer</DropdownMenuLabel>
                      {person.role === "cashier" && (
                        <DropdownMenuItem onClick={() => handleTransferRole(person, "manager")}>
                          <UserSwitchIcon className="mr-2 size-4" />
                          Transfer to Supervisor
                        </DropdownMenuItem>
                      )}
                      {person.role === "manager" && (
                        <DropdownMenuItem onClick={() => handleTransferRole(person, "cashier")}>
                          <UserSwitchIcon className="mr-2 size-4" />
                          Transfer to Cashier
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setRemovingUser(person)}
                      >
                        <TrashIcon className="mr-2 size-4" />
                        Remove from staff
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="border-t pt-2 text-center text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  Primary account (Owner)
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <Dialog open onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Avatar size="lg">
                  <AvatarFallback className="text-base font-bold">
                    {selectedUser.avatar || selectedUser.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle>{selectedUser.name}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-0.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-none border px-1.5 py-0.2 text-[9px] font-bold tracking-widest uppercase",
                        roleBadgeColors[selectedUser.role] || "border-border text-foreground"
                      )}
                    >
                      {roleLabels[selectedUser.role] || selectedUser.role}
                    </span>
                    <span>·</span>
                    <span>{selectedUser.shop || "Shoe Shop"}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2 border bg-muted/40 p-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Email</p>
                  <p className="mt-0.5 truncate text-xs font-medium">{selectedUser.email || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Phone</p>
                  <p className="mt-0.5 text-xs font-medium">{selectedUser.phone || "—"}</p>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Joined date</p>
                  <p className="mt-0.5 text-xs font-medium">{selectedUser.joinedAt || "2024"}</p>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Last active</p>
                  <p className="mt-0.5 text-xs font-medium">
                    {getLastActive(selectedUser.id) ? timeAgo(getLastActive(selectedUser.id)) : "Never"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border p-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Sales handled</p>
                  <p className="mt-1 font-heading text-lg font-bold">{getSalesCount(selectedUser.id)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Shifts logged</p>
                  <p className="mt-1 font-heading text-lg font-bold">{getShiftsCount(selectedUser.id)}</p>
                </div>
              </div>

              {selectedUser.role !== "admin" && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Transfer job role</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedUser.role === "manager" ? "default" : "outline"}
                      className="flex-1"
                      disabled={selectedUser.role === "manager"}
                      onClick={() => handleTransferRole(selectedUser, "manager")}
                    >
                      Supervisor
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedUser.role === "cashier" ? "default" : "outline"}
                      className="flex-1"
                      disabled={selectedUser.role === "cashier"}
                      onClick={() => handleTransferRole(selectedUser, "cashier")}
                    >
                      Cashier
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Cashiers can process sales at checkout. Supervisors manage stock, returns, and catalog.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              {selectedUser.role !== "admin" ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const user = selectedUser
                    setSelectedUser(null)
                    setRemovingUser(user)
                  }}
                >
                  <TrashIcon />
                  Remove staff
                </Button>
              ) : <div />}
              <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Remove Confirmation Dialog */}
      {removingUser && (
        <Dialog open onOpenChange={(open) => !open && setRemovingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mb-2 flex items-center gap-2 text-destructive">
                <WarningIcon className="size-6" weight="fill" />
                <span className="text-xs font-semibold tracking-[0.2em] uppercase">Confirm removal</span>
              </div>
              <DialogTitle>Remove {removingUser.name}?</DialogTitle>
              <DialogDescription>
                This will remove {removingUser.name} ({roleLabels[removingUser.role]}) from your staff roster and revoke their POS access.
                Default staff can be restored at any time by resetting demo data in Settings.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRemovingUser(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmRemove}>
                <TrashIcon />
                Remove staff member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
