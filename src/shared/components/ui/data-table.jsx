"use client"

import { createPaginatedRowModel, rowPaginationFeature, tableFeatures, useTable } from "@tanstack/react-table"
import { cn } from "cn"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { PAGE_SIZE, TablePagination } from "@/shared/components/ui/table-pagination"

const features = tableFeatures({ rowPaginationFeature, paginatedRowModel: createPaginatedRowModel() })
const NO_ROWS = []

const classOf = (column, part) => cn(column.columnDef.meta?.className, column.columnDef.meta?.[part])

const clickableRow = "cursor-pointer outline-none focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"

const rowProps = (onRowClick, original) => {
  if (!onRowClick) return {}
  const handleKeyDown = (event) => {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return
    event.preventDefault()
    onRowClick(original)
  }
  return { tabIndex: 0, onClick: () => onRowClick(original), onKeyDown: handleKeyDown }
}

export const DataTable = ({ columns, data = NO_ROWS, getRowId, onRowClick, rowClassName, empty = "No results.", page = 1, pageSize = PAGE_SIZE, total, onPageChange, className }) => {
  const server = total !== undefined
  const rowCount = server ? total : data.length
  const size = onPageChange ? pageSize : Math.max(data.length, 1)
  const pageCount = Math.max(1, Math.ceil(rowCount / size))
  const pageIndex = Math.min(page, pageCount) - 1
  const pagination = { pageIndex, pageSize: size }

  const table = useTable({
    features,
    columns,
    data,
    getRowId,
    manualPagination: server,
    rowCount,
    autoResetPageIndex: false,
    state: { pagination },
    onPaginationChange: (updater) => onPageChange?.((typeof updater === "function" ? updater(pagination) : updater).pageIndex + 1),
  })
  const rows = table.getRowModel().rows
  const hasFooter = rows.length > 0 && columns.some(({ footer }) => footer)

  return (
    <>
      <Table className={className}>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id} className={classOf(header.column, "headerClassName")}>
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow key={row.id} className={cn(onRowClick && clickableRow, rowClassName)} {...rowProps(onRowClick, row.original)}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className={classOf(cell.column, "cellClassName")}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-24 text-center whitespace-normal text-muted-foreground">
                {empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {hasFooter && (
          <TableFooter>
            {table.getFooterGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((footer) => (
                  <TableCell key={footer.id} className={classOf(footer.column, "footerClassName")}>
                    {footer.isPlaceholder ? null : <table.FlexRender footer={footer} />}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableFooter>
        )}
      </Table>
      {onPageChange && <TablePagination page={pageIndex + 1} pageCount={pageCount} total={rowCount} size={size} onPageChange={(next) => table.setPageIndex(next - 1)} />}
    </>
  )
}
