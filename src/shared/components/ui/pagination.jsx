import { CaretLeftIcon, CaretRightIcon, DotsThreeIcon } from "@phosphor-icons/react/ssr"
import { cn } from "cn"
import { Button } from "@/shared/components/ui/button"

export const Pagination = ({ className, ...props }) => <nav aria-label="Pagination" data-slot="pagination" className={cn("flex", className)} {...props} />

export const PaginationContent = ({ className, ...props }) => <ul data-slot="pagination-content" className={cn("flex items-center gap-1", className)} {...props} />

export const PaginationItem = (props) => <li data-slot="pagination-item" {...props} />

export const PaginationLink = ({ className, isActive, size = "icon-sm", ...props }) => (
  <Button data-slot="pagination-link" data-active={isActive} aria-current={isActive ? "page" : undefined} variant={isActive ? "default" : "ghost"} size={size} className={cn("tabular-nums", className)} {...props} />
)

export const PaginationPrevious = ({ className, ...props }) => (
  <PaginationLink aria-label="Previous page" className={className} {...props}>
    <CaretLeftIcon />
  </PaginationLink>
)

export const PaginationNext = ({ className, ...props }) => (
  <PaginationLink aria-label="Next page" className={className} {...props}>
    <CaretRightIcon />
  </PaginationLink>
)

export const PaginationEllipsis = ({ className, ...props }) => (
  <span aria-hidden data-slot="pagination-ellipsis" className={cn("flex size-8 items-center justify-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4", className)} {...props}>
    <DotsThreeIcon />
  </span>
)
