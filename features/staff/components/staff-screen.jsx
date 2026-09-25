"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { cn } from "cn"
import { CheckCircleIcon, DotsThreeVerticalIcon, InfoIcon, MagnifyingGlassIcon, PlusIcon, ProhibitIcon, TrashIcon, UserSwitchIcon } from "@phosphor-icons/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination, paginate, resetsPage } from "@/components/ui/table-pagination"
import { roleLabels } from "@/features/auth/lib/roles"
import { activeStaff } from "@/features/demo/lib/staff"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { timeAgo } from "@/lib/dates"
import { changeRoleAction, createStaffAction, removeStaffAction, setAccessAction, setPasswordAction } from "../actions"
import { CreateStaffDialog } from "./create-staff-dialog"
import { RemoveStaffDialog } from "./remove-staff-dialog"
import { RoleBadge } from "./role-badge"
import { StaffDetailsDialog } from "./staff-details-dialog"

const roleFilters = [
  { key: "all", label: "All staff" },
  { key: "manager", label: "Supervisors" },
  { key: "cashier", label: "Cashiers" },
]

const latest = (list) => list.reduce((max, at) => Math.max(max, new Date(at).getTime()), 0)

const unreachable = { error: "Could not reach the server. Check the connection." }

export const StaffScreen = () => {
  const staff = useLedgerStore(({ staff }) => staff)
  const sales = useLedgerStore(({ sales }) => sales)
  const shifts = useLedgerStore(({ shifts }) => shifts)
  const movements = useLedgerStore(({ movements }) => movements)

  const [roleFilter, setRoleFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [pending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [creating, setCreating] = useState(false)

  const search = query.trim().toLowerCase()
  const people = activeStaff(staff)
  const selected = selectedId ? (staff[selectedId] ?? null) : null

  const visible = people.filter(
    (person) =>
      (roleFilter === "all" || person.role === roleFilter) &&
      (!search || [person.name, person.username, person.email, person.phone, person.shop, roleLabels[person.role]].some((value) => value?.toLowerCase().includes(search)))
  )

  const pagination = paginate(visible, page)

  const withReset = resetsPage(setPage)

  const activityOf = (id) => {
    const mine = sales.filter(({ cashierId }) => cashierId === id)
    const myShifts = shifts.filter(({ cashierId }) => cashierId === id)
    return {
      sales: mine.length,
      shifts: myShifts.length,
      lastActive: latest([
        ...mine.map(({ soldAt }) => soldAt),
        ...myShifts.map(({ closedAt, openedAt }) => closedAt ?? openedAt),
        ...movements.filter(({ userId }) => userId === id).map(({ createdAt }) => createdAt),
      ]),
    }
  }

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
              const lastActive = activityOf(person.id).lastActive
              const isOwner = person.role === "admin"

              return (
                <TableRow key={person.id} className="hover:bg-accent/40" onClick={() => setSelectedId(person.id)}>
                  <TableCell className="w-full max-w-0 @lg:w-auto @lg:max-w-none">
                    <div className="flex items-center gap-3">
                      <Avatar size="default" className="size-9 shrink-0">
                        <AvatarFallback className="text-xs font-semibold">{person.avatar || person.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn("truncate text-sm font-medium", off && "text-muted-foreground line-through")}>{person.name}</p>
                          <RoleBadge role={person.role} className="@lg:hidden" />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          <span className="font-mono">{person.username}</span> · {person.shop}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden @@4xl:table-cell">
                    <RoleBadge role={person.role} />
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground @2xl:table-cell">
                    <p className="truncate">{person.email || "—"}</p>
                    <p className="mt-0.5">{person.phone || "—"}</p>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground @4xl:table-cell">{person.shop}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground @@4xl:table-cell">{lastActive ? timeAgo(lastActive) : "Never"}</TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase", off ? "text-destructive" : "text-success")}>
                        <span className={cn("size-1.5 rounded-full", off ? "bg-destructive" : "bg-success")} />
                        <span className="hidden @lg:inline">{off ? "Disabled" : "Active"}</span>
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

      {creating && <CreateStaffDialog pending={pending} onClose={() => setCreating(false)} onCreate={handleCreate} />}
      {selected && (
        <StaffDetailsDialog
          person={selected}
          activity={activityOf(selected.id)}
          pending={pending}
          onTransfer={handleTransfer}
          onSetPassword={handleSetPassword}
          onRemove={(person) => {
            setSelectedId(null)
            setRemoving(person)
          }}
          onClose={() => setSelectedId(null)}
        />
      )}
      {removing && <RemoveStaffDialog person={removing} pending={pending} onCancel={() => setRemoving(null)} onConfirm={handleConfirmRemove} />}
    </div>
  )
}
