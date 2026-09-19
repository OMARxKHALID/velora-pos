import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"

export const PAGE_SIZE = 10

export const paginate = (list, page, size = PAGE_SIZE) => {
  const pageCount = Math.max(1, Math.ceil(list.length / size))
  const current = Math.min(Math.max(page, 1), pageCount)
  return { rows: list.slice((current - 1) * size, current * size), page: current, pageCount, total: list.length, size }
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
      <div className="flex items-center gap-1">
        <Button size="icon-sm" variant="ghost" aria-label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <CaretLeftIcon />
        </Button>
        {pageNumbers(page, pageCount).map((value, index) =>
          value === "gap" ? (
            <span key={`gap-${index}`} className="hidden w-6 text-center text-xs text-muted-foreground sm:inline">
              …
            </span>
          ) : (
            <Button
              key={value}
              size="icon-sm"
              variant={value === page ? "default" : "ghost"}
              className={cn("tabular-nums", value !== page && "hidden sm:inline-flex")}
              onClick={() => onPageChange(value)}
            >
              {value}
            </Button>
          )
        )}
        <Button size="icon-sm" variant="ghost" aria-label="Next page" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          <CaretRightIcon />
        </Button>
      </div>
    </div>
  )
}
