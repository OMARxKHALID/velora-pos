"use client"

import { useDeferredValue, useState } from "react"
import { CaretDownIcon, FileCsvIcon, MagnifyingGlassIcon, ReceiptIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination, paginate, resetsPage } from "@/components/ui/table-pagination"
import { cashierIdsFor } from "@/features/analytics/lib/analytics"
import { useStaffName } from "@/features/demo/hooks/use-directory"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { useBarcodeScanner } from "@/features/pos/hooks/use-barcode-scanner"
import { ShiftReportDialog } from "@/features/pos/components/shift-report-dialog"
import { toCsv } from "@/lib/csv"
import { formatFullDateTime, DAY, formatDateTime, startOfToday } from "@/lib/dates"
import { downloadFile } from "@/lib/download"
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

const rupees = (paisa) => (paisa / 100).toFixed(2)

const MAX_REPORT_SHIFTS = 10

export const SalesScreen = ({ user }) => {
  const allSales = useLedgerStore(({ sales }) => sales)
  const shifts = useLedgerStore(({ shifts }) => shifts)
  const scope = useShopScope(user)
  const sales = scope === ALL_SHOPS ? allSales : allSales.filter(({ shopId }) => shopId === scope)
  const refunds = useLedgerStore(({ refunds }) => refunds)
  const staff = useLedgerStore(({ staff }) => staff)
  const nameOf = useStaffName()
  const closedShifts = shifts
    .filter(({ status, shopId, cashierId }) => status === "closed" && (scope === ALL_SHOPS || shopId === scope) && (user.role !== "cashier" || cashierId === user.id))
    .toReversed()
    .slice(0, MAX_REPORT_SHIFTS)
  const cashiers = cashierIdsFor({ sales }, staff)
  const [range, setRange] = useState("7d")
  const [cashier, setCashier] = useState(user.role === "cashier" ? user.id : "all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState(null)
  const [selectedShift, setSelectedShift] = useState(null)
  const search = useDeferredValue(query.trim().toLowerCase())
  const byId = refundsBySale(refunds)
  const from = ranges.find(({ key }) => key === range).from()

  const visible = sales
    .filter(
      (sale) =>
        new Date(sale.soldAt).getTime() >= from &&
        (cashier === "all" || sale.cashierId === cashier) &&
        (!search ||
          sale.number.toLowerCase().includes(search) ||
          sale.customerName?.toLowerCase().includes(search) ||
          sale.customerPhone?.toLowerCase().includes(search) ||
          ((search === "offline" || search === "not synced") && !sale.syncedAt) ||
          sale.items.some(({ productName }) => productName.toLowerCase().includes(search)))
    )
    .toReversed()

  const pagination = paginate(visible, page)

  const withReset = resetsPage(setPage)

  const handleExportSalesCsv = () => {
    try {
      const rows = [
        ["Receipt #", "Date/Time", "Cashier", "Customer", "Phone", "Items Count", "Subtotal", "Discount", "Tax", "Total", "Payment Methods"],
        ...visible.map((s) => [
          s.number,
          formatFullDateTime(s.soldAt),
          nameOf(s.cashierId),
          s.customerName || "",
          s.customerPhone || "",
          String(s.items.length),
          rupees(s.subtotal),
          rupees(s.discountTotal),
          rupees(s.taxTotal ?? 0),
          rupees(s.total),
          s.payments.map((p) => `${p.method.toUpperCase()} (${rupees(p.amount)})`).join("; "),
        ]),
      ]
      downloadFile(`velora-sales-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows))
      toast.success("Sales exported", { description: `${visible.length} sales downloaded to CSV.` })
    } catch {
      toast.error("Failed to export sales")
    }
  }

  const handleScan = (code) => {
    const sale = sales.find(({ number, cashierId }) => number === code.toUpperCase() && (user.role !== "cashier" || cashierId === user.id))
    if (sale) setOpenId(sale.id)
  }

  useBarcodeScanner(handleScan)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <InputGroup className="w-full @xl:w-72 @4xl:w-80">
          <InputGroupAddon>
            <MagnifyingGlassIcon />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} placeholder="Receipt no, customer, or shoe name" />
        </InputGroup>
        <Segmented label="Date range" options={ranges} value={range} onChange={withReset(setRange)} />
        {user.role !== "cashier" && (
          <Segmented label="Cashier" options={[{ key: "all", label: "All cashiers" }, ...cashiers.map((id) => ({ key: id, label: nameOf(id).split(" ")[0] }))]} value={cashier} onChange={withReset(setCashier)} />
        )}
        <div className="flex w-full items-center gap-2 @2xl:ml-auto @2xl:w-auto">
          {closedShifts.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="flex-1 @2xl:flex-initial" />}>
                <ReceiptIcon className="text-gold" />
                Z-reports
                <CaretDownIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Closed shifts</DropdownMenuLabel>
                  {closedShifts.map((shift) => (
                    <DropdownMenuItem key={shift.id} onClick={() => setSelectedShift(shift)}>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{formatDateTime(shift.closedAt)}</span>
                        <span className="truncate text-xs text-muted-foreground">{nameOf(shift.cashierId)}</span>
                      </span>
                      <span className={shift.difference === 0 ? "text-xs text-success" : "text-xs text-warning"}>
                        {shift.difference === 0 ? "Balanced" : `${shift.difference > 0 ? "+" : "−"}${formatMoney(Math.abs(shift.difference))}`}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="outline" size="sm" className="flex-1 @2xl:flex-initial" disabled={!visible.length} onClick={handleExportSalesCsv}>
            <FileCsvIcon />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale</TableHead>
              {user.role !== "cashier" && <TableHead className="hidden @2xl:table-cell">Cashier</TableHead>}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.rows.map((sale) => (
              <TableRow key={sale.id} onClick={() => setOpenId(sale.id)}>
                <TableCell className="whitespace-normal @lg:whitespace-nowrap">
                  <p className="font-mono text-xs">{sale.number}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(sale.soldAt)}
                    {sale.customerName && <span className="font-medium text-foreground/85"> · {sale.customerName}</span>}
                    {user.role !== "cashier" && <span className="@2xl:hidden"> · {nameOf(sale.cashierId)}</span>}
                  </p>
                </TableCell>
                {user.role !== "cashier" && <TableCell className="hidden text-sm @2xl:table-cell">{nameOf(sale.cashierId)}</TableCell>}
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
      {selectedShift && <ShiftReportDialog shift={selectedShift} onClose={() => setSelectedShift(null)} />}
    </>
  )
}
