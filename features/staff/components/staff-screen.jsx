"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { setStaffAccess } from "@/features/auth/actions"
import { roleLabels } from "@/features/auth/lib/demo-users"
import { staff } from "@/features/demo/lib/staff"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { timeAgo } from "@/lib/dates"

const people = Object.values(staff).filter(({ role }) => role !== "admin")
const latest = (list) => list.reduce((max, at) => Math.max(max, new Date(at).getTime()), 0)

export const StaffScreen = ({ disabled: initial }) => {
  const sales = useDemoStore(({ sales }) => sales)
  const shifts = useDemoStore(({ shifts }) => shifts)
  const movements = useDemoStore(({ movements }) => movements)
  const [disabled, setDisabled] = useState(initial)
  const [pending, startTransition] = useTransition()

  const lastActive = (id) =>
    latest([
      ...sales.filter(({ cashierId }) => cashierId === id).map(({ soldAt }) => soldAt),
      ...shifts.filter(({ cashierId }) => cashierId === id).map(({ closedAt, openedAt }) => closedAt ?? openedAt),
      ...movements.filter(({ userId }) => userId === id).map(({ createdAt }) => createdAt),
    ])

  const handleToggle = (person) => {
    const enable = disabled.includes(person.id)
    startTransition(async () => {
      const result = await setStaffAccess(person.id, enable)
      if (result.error) return toast.error(result.error)
      setDisabled(result.disabled)
      toast.success(enable ? "Access turned on" : "Access turned off", {
        description: enable ? `${person.name} can sign in again.` : `${person.name} is signed out and cannot sign in.`,
      })
    })
  }

  return (
    <div className="border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Person</TableHead>
            <TableHead className="hidden sm:table-cell">Last active</TableHead>
            <TableHead className="text-right">Access</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((person) => {
            const off = disabled.includes(person.id)
            const seen = lastActive(person.id)
            return (
              <TableRow key={person.id}>
                <TableCell>
                  <p className={cn("text-sm font-medium", off && "text-muted-foreground line-through")}>{person.name}</p>
                  <p className="text-xs text-muted-foreground">{roleLabels[person.role]}</p>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{seen ? timeAgo(seen) : "Never"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <span className={cn("text-xs font-semibold tracking-widest uppercase", off ? "text-destructive" : "text-success")}>{off ? "Off" : "On"}</span>
                    <Button size="sm" variant={off ? "default" : "outline"} disabled={pending} onClick={() => handleToggle(person)}>
                      {off ? "Turn on" : "Turn off"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
