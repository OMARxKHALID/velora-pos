"use client"

import { useDeferredValue, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { CaretDownIcon, FileCsvIcon, MagnifyingGlassIcon, ReceiptIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination, resetsPage } from "@/components/ui/table-pagination"
import { useStaffName } from "@/features/staff/hooks/use-staff-name"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ALL_SHOPS } from "@/features/shops/lib/shops"
import { useBarcodeScanner } from "@/features/pos/hooks/use-barcode-scanner"
import { ShiftReportDialog } from "@/features/pos/components/shift-report-dialog"
import { formatDateTime } from "@/lib/dates"
import { downloadFrom } from "@/lib/download"
import { getJson, queryString } from "@/lib/get-json"
import { formatMoney } from "@/lib/money"
import { refundsBySale, saleRefundState } from "../lib/sale-status"
import { SaleDetailSheet } from "./sale-detail-sheet"
import { SaleStatusBadges } from "./sale-status-badges"

const ranges = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All" },
]

const MAX_REPORT_SHIFTS = 10

export const SalesScreen = ({ user }) => {
  const shifts = useLedgerStore(({ shifts }) => shifts)
  const staff = useLedgerStore(({ staff }) => staff)
  const scope = useShopScope(user)
  const nameOf = useStaffName()
  const closedShifts = shifts
    .filter(({ status, shopId, cashierId }) => status === "closed" && (scope === ALL_SHOPS || shopId === scope) && (user.role !== "cashier" || cashierId === user.id))
    .toReversed()
    .slice(0, MAX_REPORT_SHIFTS)
  const cashiers = Object.values(staff).filter(({ role }) => role === "cashier").map(({ id }) => id)
  const [range, setRange] = useState("7d")
  const [cashier, setCashier] = useState(user.role === "cashier" ? user.id : "all")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState(null)
  const [selectedShift, setSelectedShift] = useState(null)
  const search = useDeferredValue(query.trim())
  const filters = { range, cashier: user.role === "cashier" ? undefined : cashier, q: search, shop: scope }
  const { data, error, isPending } = useQuery({
    queryKey: ["sales", filters, page],
    queryFn: ({ signal }) => getJson(`/api/sales?${queryString({ ...filters, page })}`, { signal }),
    placeholderData: keepPreviousData,
  })
  const rows = data?.rows ?? []
  const byId = refundsBySale(data?.refunds ?? [])
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  const withReset = resetsPage(setPage)

  const handleExportSalesCsv = () => {
    downloadFrom(`/api/sales?${queryString({ ...filters, format: "csv" })}`)
  }

  const handleScan = async (code) => {
    const { sale } = await getJson(`/api/sales/lookup?${queryString({ number: code })}`).catch(() => ({ sale: null }))
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
          <InputGroupInput value={query} onChange={(event) => withReset(setQuery)(event.target.value)} placeholder="Receipt no, customer, or product" />
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
          <Button variant="outline" size="sm" className="flex-1 @2xl:flex-initial" disabled={!data?.total} onClick={handleExportSalesCsv}>
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
            {rows.map((sale) => (
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
        {isPending && <p className="py-12 text-center text-sm text-muted-foreground">Loading sales…</p>}
        {error && !data && <p className="py-12 text-center text-sm text-destructive-foreground">{error.message}</p>}
        {data && !rows.length && <p className="py-12 text-center text-sm text-muted-foreground">No sales match these filters.</p>}
        {data && <TablePagination page={data.page} pageCount={pageCount} total={data.total} size={data.pageSize} onPageChange={setPage} />}
      </div>

      {openId && <SaleDetailSheet saleId={openId} user={user} onClose={() => setOpenId(null)} />}
      {selectedShift && <ShiftReportDialog shift={selectedShift} onClose={() => setSelectedShift(null)} />}
    </>
  )
}
