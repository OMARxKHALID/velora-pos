"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { cn } from "cn"
import { AirplaneTiltIcon, CheckCircleIcon, DotsThreeVerticalIcon, InfoIcon, MagnifyingGlassIcon, PlusIcon, ProhibitIcon, TrashIcon, UserSwitchIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/components/ui/input-group"
import { Segmented } from "@/shared/components/ui/segmented"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { TablePagination, paginate, resetsPage } from "@/shared/components/ui/table-pagination"
import { roleLabels } from "@/features/auth/lib/roles"
import { activeStaff, isOnLeave, worksAtClosedShop } from "@/features/staff/lib/people"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { useShopNameOf, useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS, staffShopId } from "@/features/shops/lib/shops"
import { timeAgo } from "@/shared/lib/dates"
import { changeRoleAction, createStaffAction, removeStaffAction, setAccessAction, setLeaveAction, setPasswordAction, updateProfileAction } from "../actions"
import { CreateStaffDialog } from "./create-staff-dialog"
import { EditStaffDialog } from "./edit-staff-dialog"
import { LeaveDialog } from "./leave-dialog"
import { RemoveStaffDialog } from "./remove-staff-dialog"
import { RoleBadge } from "./role-badge"
import { StaffAvatar } from "./staff-avatar"
import { StaffDetailsDialog } from "./staff-details-dialog"

const roleFilters = [
  { key: "all", label: "All staff" },
  { key: "manager", label: "Supervisors" },
  { key: "cashier", label: "Cashiers" },
]

const unreachable = { error: "Could not reach the server. Check the connection." }

const statusTones = { Disabled: "text-destructive", "On leave": "text-warning", "Shop closed": "text-warning", Active: "text-success" }

export const StaffScreen = ({ user }) => {
  const staff = useLedgerStore(({ staff }) => staff)
  const shops = useLedgerStore(({ shops }) => shops)
  const [editing, setEditing] = useState(null)
  const [leaveFor, setLeaveFor] = useState(null)

  const [roleFilter, setRoleFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [pending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [creating, setCreating] = useState(false)

  const search = query.trim().toLowerCase()
  const scope = useShopScope(user)
  const people = activeStaff(staff).filter((person) => scope === ALL_SHOPS || person.role === "admin" || staffShopId(person) === scope)
  const shopOf = useShopNameOf()
  const selected = selectedId ? (staff[selectedId] ?? null) : null

  const visible = people.filter(
    (person) =>
      (roleFilter === "all" || person.role === roleFilter) &&
      (!search || [person.name, person.username, person.email, person.phone, shopOf(person), roleLabels[person.role]].some((value) => value?.toLowerCase().includes(search)))
  )

  const pagination = paginate(visible, page)

  const withReset = resetsPage(setPage)

  const activityOf = (id) => staff[id]?.activity ?? { sales: 0, shifts: 0, lastActive: null }

  const run = (action, onDone) =>
    new Promise((resolve) =>
      startTransition(async () => {
        const result = await action().catch(() => unreachable)
        if (result.error) toast.error(result.error)
        else onDone()
        resolve(result)
      })
    )

  const handleToggleAccess = (person) => {
    const enable = person.disabled
    run(
      () => setAccessAction(person.id, enable),
      () =>
        toast.success(enable ? "Access restored" : "Access turned off", {
          description: enable ? `${person.name} can sign in again.` : `${person.name} is signed out everywhere and cannot sign in until you turn access back on.`,
        })
    )
  }

  const handleTransfer = (person, role) =>
    run(
      () => changeRoleAction(person.id, role),
      () => toast.success("Role changed", { description: `${person.name} is now ${roleLabels[role]}. It applies straight away.` })
    )

  const handleConfirmRemove = () =>
    run(
      () => removeStaffAction(removing.id),
      () => {
        toast.success("Staff member removed", { description: `${removing.name} has left the team and cannot sign in.` })
        if (selectedId === removing.id) setSelectedId(null)
        setRemoving(null)
      }
    )

  const handleCreate = (input) =>
    run(
      () => createStaffAction(input),
      () => {
        toast.success("Staff member added", { description: `${input.name} joined as ${roleLabels[input.role]} and can sign in as ${input.username.trim().toLowerCase()}.` })
        setCreating(false)
      }
    )

  const handleSetPassword = (person, password) =>
    run(
      () => setPasswordAction(person.id, password),
      () => toast.success("Password changed", { description: `${person.name} was signed out and can sign in with the new password.` })
    )

  const handleLeave = (person, leave) =>
    run(
      () => setLeaveAction(person.id, leave),
      () => {
        toast.success(leave ? "Leave saved" : "Welcome back", { description: leave ? `${person.name} is marked on leave.` : `${person.name} can sign in again.` })
        setLeaveFor(null)
      }
    )

  const handleSaveProfile = (id, input) =>
    run(
      () => updateProfileAction(id, input),
      () => {
        toast.success("Profile saved")
        setEditing(null)
      }
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <InputGroup className="w-full @xl:w-72">
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} placeholder="Name, username, email or phone" />
        </InputGroup>
        <Segmented label="Role" options={roleFilters} value={roleFilter} onChange={withReset(setRoleFilter)} />
        <Button size="sm" className="w-full @2xl:ml-auto @2xl:w-auto" onClick={() => setCreating(true)}>
          <PlusIcon />
          Add staff member
        </Button>
      </div>

      <div className="border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff member</TableHead>
              <TableHead className="hidden @@4xl:table-cell">Role</TableHead>
              <TableHead className="hidden @2xl:table-cell">Contact</TableHead>
              <TableHead className="hidden @4xl:table-cell">Location</TableHead>
              <TableHead className="hidden @@4xl:table-cell">Last active</TableHead>
              <TableHead className="text-right">Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.rows.map((person) => {
              const off = person.disabled
              const status = off ? "Disabled" : isOnLeave(person) ? "On leave" : worksAtClosedShop(person, shops) ? "Shop closed" : "Active"
              const lastActive = activityOf(person.id).lastActive
              const isOwner = person.role === "admin"

              return (
                <TableRow key={person.id} className="hover:bg-accent/40" onClick={() => setSelectedId(person.id)}>
                  <TableCell className="w-full max-w-0 @lg:w-auto @lg:max-w-none">
                    <div className="flex items-center gap-3">
                      <StaffAvatar person={person} className="size-9 shrink-0" fallbackClassName="text-xs font-semibold" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn("truncate text-sm font-medium", off && "text-muted-foreground line-through")}>{person.name}</p>
                          <RoleBadge role={person.role} className="@lg:hidden" />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="font-mono">{person.username}</span> · {shopOf(person)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden @3xl:table-cell">
                    <RoleBadge role={person.role} />
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground @2xl:table-cell">
                    <p className="truncate">{person.email || "—"}</p>
                    <p className="mt-0.5">{person.phone || "—"}</p>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground @4xl:table-cell">{shopOf(person)}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground @5xl:table-cell">{lastActive ? timeAgo(lastActive) : "Never"}</TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase", statusTones[status])}>
                        <span className="size-1.5 rounded-full bg-current" />
                        <span className="hidden @lg:inline">{status}</span>
                      </span>

                      {isOwner ? (
                        <span className="text-2xs font-semibold tracking-widest text-muted-foreground uppercase">Owner</span>
                      ) : (
                        <>
                          <Button size="xs" variant={off ? "default" : "outline"} disabled={pending} onClick={() => handleToggleAccess(person)} className="hidden @lg:inline-flex">
                            {off ? "Turn on" : "Turn off"}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button size="icon-xs" variant="ghost" aria-label={`Options for ${person.name}`} />}>
                              <DotsThreeVerticalIcon />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>Manage staff</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setSelectedId(person.id)}>
                                  <InfoIcon />
                                  View details
                                </DropdownMenuItem>
                                <DropdownMenuItem className="@lg:hidden" disabled={pending} onClick={() => handleToggleAccess(person)}>
                                  {off ? <CheckCircleIcon className="text-success" /> : <ProhibitIcon className="text-destructive" />}
                                  {off ? "Turn on access" : "Turn off access"}
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              {person.leave ? (
                                <DropdownMenuItem onClick={() => handleLeave(person, null)}>
                                  <CheckCircleIcon className="text-success" />
                                  End leave
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => setLeaveFor(person)}>
                                  <AirplaneTiltIcon />
                                  Mark on leave
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleTransfer(person, person.role === "cashier" ? "manager" : "cashier")}>
                                <UserSwitchIcon />
                                {person.role === "cashier" ? "Make supervisor" : "Make cashier"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setRemoving(person)}>
                                <TrashIcon />
                                Remove from staff
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {!visible.length && <p className="py-12 text-center text-sm text-muted-foreground">No staff members match.</p>}
        <TablePagination {...pagination} onPageChange={setPage} />
      </div>

      <p className="text-xs text-muted-foreground">Tap a staff member to see their profile and activity, or to set a new password. Everyone on this list signs in with their own username.</p>

      {creating && <CreateStaffDialog user={user} pending={pending} onClose={() => setCreating(false)} onCreate={handleCreate} />}
      {selected && (
        <StaffDetailsDialog
          person={selected}
          activity={activityOf(selected.id)}
          pending={pending}
          onEdit={(person) => {
            setSelectedId(null)
            setEditing(person)
          }}
          onTransfer={handleTransfer}
          onSetPassword={handleSetPassword}
          onRemove={(person) => {
            setSelectedId(null)
            setRemoving(person)
          }}
          onClose={() => setSelectedId(null)}
        />
      )}
      {leaveFor && <LeaveDialog person={leaveFor} onClose={() => setLeaveFor(null)} onSave={handleLeave} />}
      {editing && <EditStaffDialog person={editing} onClose={() => setEditing(null)} onSave={handleSaveProfile} />}
      {removing && <RemoveStaffDialog person={removing} pending={pending} onCancel={() => setRemoving(null)} onConfirm={handleConfirmRemove} />}
    </div>
  )
}
