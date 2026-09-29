import { cn } from "cn"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/shared/components/ui/pagination"

export const PAGE_SIZE = 10

export const paginate = (list, page, size = PAGE_SIZE) => {
  const pageCount = Math.max(1, Math.ceil(list.length / size))
  const current = Math.min(Math.max(page, 1), pageCount)
  return { rows: list.slice((current - 1) * size, current * size), page: current, pageCount, total: list.length, size }
}

export const resetsPage = (setPage) => (setter) => (value) => {
  setter(value)
  setPage(1)
}

const pageNumbers = (page, pageCount) => {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((value) => value >= 1 && value <= pageCount))
  return [...pages].toSorted((a, b) => a - b).flatMap((value, index, list) => (index && value - list[index - 1] > 1 ? ["gap", value] : [value]))
}

export const TablePagination = ({ page, pageCount, total, size = PAGE_SIZE, onPageChange, className }) => {
  if (!total) return null
  const first = (page - 1) * size + 1
  const last = Math.min(page * size, total)

  return (
    <div className={cn("flex items-center justify-between gap-3 border-t px-3 py-2", className)}>
      <p className="text-xs text-muted-foreground tabular-nums">
        {first}–{last} of {total}
      </p>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
          </PaginationItem>
          {pageNumbers(page, pageCount).map((value, index) =>
            value === "gap" ? (
              <PaginationItem key={`gap-${index}`} className="hidden sm:block">
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={value} className={cn(value !== page && "hidden sm:block")}>
                <PaginationLink isActive={value === page} onClick={() => onPageChange(value)}>
                  {value}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
