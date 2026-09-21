"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { cn } from "cn"
import {
  CheckCircleIcon,
  DotsThreeVerticalIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ProhibitIcon,
  TrashIcon,
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { setStaffAccess } from "@/features/auth/actions"
import { roleLabels } from "@/features/auth/lib/demo-users"
import { initialStaff } from "@/features/demo/lib/staff"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { timeAgo } from "@/lib/dates"

const roleBadgeColors = {
  admin: "border-gold/40 bg-gold/10 text-gold",
  manager: "border-primary/30 bg-primary/10 text-primary",
  cashier: "border-border bg-secondary text-secondary-foreground",
}

const roleFilters = [
  { key: "all", label: "All staff" },
  { key: "manager", label: "Supervisors" },
  { key: "cashier", label: "Cashiers" },
]

const createRoleOptions = [
  { key: "cashier", label: "Cashier" },
  { key: "manager", label: "Supervisor" },
]

const latest = (list) => list.reduce((max, at) => Math.max(max, new Date(at).getTime()), 0)

const CreateStaffDialog = ({ onClose, onCreate }) => {
  const [name, setName] = useState("")
  const [role, setRole] = useState("cashier")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [shop, setShop] = useState("Shoe Shop")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error("Please enter the staff member's full name")
    onCreate({ name, role, email, phone, shop })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md [scrollbar-width:thin] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
          <DialogDescription>
            Create a new team member and assign them as a Cashier or Supervisor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Field>
            <FieldLabel htmlFor="staff-name">Full name</FieldLabel>
            <Input
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Zain Malik"
              autoFocus
              required
            />
          </Field>

          <Field>
            <FieldLabel>Role assignment</FieldLabel>
            <Segmented
              options={createRoleOptions}
              value={role}
              onChange={setRole}
            />
            <FieldDescription>
              {role === "cashier"
                ? "Cashiers process counter sales, scans, and payments."
                : "Supervisors approve returns, manage stock, and supervise staff."}
            </FieldDescription>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="staff-email">Work email</FieldLabel>
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. zain@velora.pk"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-phone">Phone number</FieldLabel>
              <Input
                id="staff-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0300 1234567"
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="staff-shop">Store branch</FieldLabel>
            <Input
              id="staff-shop"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="Shoe Shop"
            />
          </Field>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <PlusIcon />
              Add staff member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export const StaffScreen = ({ disabled: initial = [] }) => {
  const staff = useDemoStore(({ staff }) => staff || initialStaff)
  const sales = useDemoStore(({ sales }) => sales)
  const shifts = useDemoStore(({ shifts }) => shifts)
  const movements = useDemoStore(({ movements }) => movements)
  const transferStaffRole = useDemoStore(({ transferStaffRole }) => transferStaffRole)
  const removeStaff = useDemoStore(({ removeStaff }) => removeStaff)
  const addStaff = useDemoStore(({ addStaff }) => addStaff)

  const [disabled, setDisabled] = useState(initial)
  const [roleFilter, setRoleFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [pending, startTransition] = useTransition()
  const [selectedUser, setSelectedUser] = useState(null)
  const [removingUser, setRemovingUser] = useState(null)
  const [creating, setCreating] = useState(false)

  const people = Object.values(staff)
  const search = query.trim().toLowerCase()

  const visiblePeople = people.filter((person) => {
    if (roleFilter !== "all" && person.role !== roleFilter) return false
    if (!search) return true
    return (
      person.name.toLowerCase().includes(search) ||
      (person.email && person.email.toLowerCase().includes(search)) ||
      (person.phone && person.phone.includes(search)) ||
      (person.shop && person.shop.toLowerCase().includes(search)) ||
      (roleLabels[person.role] && roleLabels[person.role].toLowerCase().includes(search))
    )
  })

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
    <div className="space-y-4">
      {/* Top Filter, Search & Add Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <InputGroup className="h-9 w-full sm:w-64 lg:w-72">
            <InputGroupAddon>
              <MagnifyingGlassIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Staff name, email or phone"
            />
          </InputGroup>
          <div className="overflow-x-auto pb-0.5 sm:pb-0 [scrollbar-width:none]">
            <Segmented options={roleFilters} value={roleFilter} onChange={setRoleFilter} />
          </div>
        </div>
        <Button size="sm" className="w-full shrink-0 touch-manipulation sm:w-auto active:scale-95" onClick={() => setCreating(true)}>
          <PlusIcon />
          Add staff member
        </Button>
      </div>

      {/* Main Responsive Table */}
      <div className="overflow-x-auto border bg-card [scrollbar-width:thin]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff member</TableHead>
              <TableHead className="hidden sm:table-cell">Role</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead className="hidden sm:table-cell">Last active</TableHead>
              <TableHead className="text-right">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePeople.map((person) => {
              const off = disabled.includes(person.id)
              const seen = getLastActive(person.id)
              const isOwner = person.role === "admin"

              return (
                <TableRow
                  key={person.id}
                  className="cursor-pointer transition-colors hover:bg-accent/40"
                  onClick={() => setSelectedUser(person)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar size="default" className="size-8 sm:size-9 shrink-0">
                        <AvatarFallback className="font-semibold text-xs sm:text-sm">
                          {person.avatar || person.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              "truncate text-sm font-medium text-foreground",
                              off && "text-muted-foreground line-through"
                            )}
                          >
                            {person.name}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-none border px-1.5 py-0.2 text-[9px] font-bold tracking-widest uppercase sm:hidden",
                              roleBadgeColors[person.role]
                            )}
                          >
                            {roleLabels[person.role] || person.role}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {person.shop || "Shoe Shop"} · {person.email || person.phone}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden sm:table-cell">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-none border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase",
                        roleBadgeColors[person.role]
                      )}
                    >
                      {roleLabels[person.role] || person.role}
                    </span>
                  </TableCell>

                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    <div className="space-y-0.5">
                      <p className="truncate">{person.email}</p>
                      <p className="text-[11px]">{person.phone}</p>
                    </div>
                  </TableCell>

                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {person.shop || "Shoe Shop"}
                  </TableCell>

                  <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                    {seen ? timeAgo(seen) : "Never"}
                  </TableCell>

                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase",
                          off ? "text-destructive" : "text-success"
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", off ? "bg-destructive" : "bg-success")} />
                        <span className="hidden sm:inline">{off ? "Disabled" : "Active"}</span>
                      </span>

                      {!isOwner ? (
                        <>
                          <Button
                            size="xs"
                            variant={off ? "default" : "outline"}
                            disabled={pending}
                            onClick={() => handleToggleAccess(person)}
                            className="hidden touch-manipulation pointer-coarse:h-9 sm:inline-flex"
                          >
                            {off ? "Turn on" : "Turn off"}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label="Staff options"
                                  className="touch-manipulation pointer-coarse:size-9"
                                />
                              }
                            >
                              <DotsThreeVerticalIcon />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>Manage staff</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setSelectedUser(person)}>
                                  <InfoIcon className="mr-2 size-4" />
                                  View user details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="sm:hidden"
                                  disabled={pending}
                                  onClick={() => handleToggleAccess(person)}
                                >
                                  {off ? (
                                    <>
                                      <CheckCircleIcon className="mr-2 size-4 text-success" />
                                      Turn on access
                                    </>
                                  ) : (
                                    <>
                                      <ProhibitIcon className="mr-2 size-4 text-destructive" />
                                      Turn off access
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuGroup>
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
                              </DropdownMenuGroup>
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
                          Owner
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {!visiblePeople.length && (
          <p className="py-12 text-center text-sm text-muted-foreground">No staff members match.</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Tap any staff member to view full profile, logged sales, and activity history.
      </p>

      {/* Create Staff Dialog */}
      {creating && (
        <CreateStaffDialog
          onClose={() => setCreating(false)}
          onCreate={(input) => {
            try {
              const created = addStaff(input)
              toast.success("Staff member created", {
                description: `${created.name} added as ${roleLabels[created.role]}.`,
              })
              setCreating(false)
            } catch (err) {
              toast.error(err.message || "Failed to create staff member")
            }
          }}
        />
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <Dialog open onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md [scrollbar-width:thin] p-4 sm:p-6">
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
                        roleBadgeColors[selectedUser.role]
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
                    Cashiers can process checkout sales. Supervisors manage stock, returns, and catalog.
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
