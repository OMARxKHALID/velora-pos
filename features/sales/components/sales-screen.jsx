"use client"

import { useDeferredValue, useState } from "react"
import { MagnifyingGlassIcon } from "@phosphor-icons/react"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination, paginate } from "@/components/ui/table-pagination"
import { staff, staffName } from "@/features/demo/lib/staff"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { useBarcodeScanner } from "@/features/pos/hooks/use-barcode-scanner"
import { DAY, formatDateTime, startOfToday } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { refundsBySale, saleRefundState } from "../lib/sale-status"
import { SaleDetailSheet } from "./sale-detail-sheet"
import { SaleStatusBadges } from "./sale-status-badges"

const ranges = [
  { key: "today", label: "Today", from: () => startOfToday() },
  { key: "7d", label: "7 days", from: () => startOfToday() - 6 * DAY },
  { key: "30d", label: "30 days", from: () => startOfToday() - 29 * DAY },
  { key: "all", label: "All", from: () => 0 },
]

const cashiers = Object.values(staff).filter(({ role }) => role === "cashier")

export const SalesScreen = ({ user }) => {
  const sales = useDemoStore(({ sales }) => sales)
  const refunds = useDemoStore(({ refunds }) => refunds)
  const [range, setRange] = useState("7d")
  const [cashier, setCashier] = useState(user.role === "cashier" ? user.id : "all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState(null)
  const search = useDeferredValue(query.trim().toLowerCase())
  const byId = refundsBySale(refunds)
  const from = ranges.find(({ key }) => key === range).from()

  const visible = sales
    .filter(
      (sale) =>
        new Date(sale.soldAt).getTime() >= from &&
        (cashier === "all" || sale.cashierId === cashier) &&
        (!search || sale.number.toLowerCase().includes(search) || sale.items.some(({ productName }) => productName.toLowerCase().includes(search)))
    )
    .toReversed()

  const pagination = paginate(visible, page)

  const withReset = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const handleScan = (code) => {
    const sale = sales.find(({ number }) => number === code.toUpperCase())
    if (sale) setOpenId(sale.id)
  }

  useBarcodeScanner(handleScan)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="h-9 w-full sm:w-72">
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} placeholder="Receipt no. or shoe name" />
        </InputGroup>
        <Segmented options={ranges} value={range} onChange={withReset(setRange)} />
        {user.role !== "cashier" && (
          <Segmented options={[{ key: "all", label: "All cashiers" }, ...cashiers.map(({ id, name }) => ({ key: id, label: name.split(" ")[0] }))]} value={cashier} onChange={withReset(setCashier)} />
        )}
      </div>

      <div className="border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale</TableHead>
              {user.role !== "cashier" && <TableHead className="hidden md:table-cell">Cashier</TableHead>}
              <TableHead className="hidden lg:table-cell">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.rows.map((sale) => (
              <TableRow key={sale.id} className="cursor-pointer" onClick={() => setOpenId(sale.id)}>
                <TableCell>
                  <p className="font-mono text-xs">{sale.number}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(sale.soldAt)}</p>
                </TableCell>
                {user.role !== "cashier" && <TableCell className="hidden text-sm md:table-cell">{staffName(sale.cashierId)}</TableCell>}
                <TableCell className="hidden max-w-64 truncate text-sm lg:table-cell">
                  {sale.items[0].productName}
                  {sale.items.length > 1 && <span className="text-muted-foreground"> +{sale.items.length - 1}</span>}
                </TableCell>
                <TableCell className="text-right">
                  <p className="font-semibold tabular-nums">{formatMoney(sale.total)}</p>
                  <div className="mt-1 flex justify-end">
                    <SaleStatusBadges sale={sale} refundState={saleRefundState(sale, byId[sale.id])} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!visible.length && <p className="py-12 text-center text-sm text-muted-foreground">No sales match these filters.</p>}
        <TablePagination {...pagination} onPageChange={setPage} />
      </div>

      {openId && <SaleDetailSheet saleId={openId} user={user} onClose={() => setOpenId(null)} />}
    </>
  )
}
