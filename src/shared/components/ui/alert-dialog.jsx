"use client"

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"
import { cn } from "cn"
import { Button } from "@/shared/components/ui/button"

export const AlertDialog = (props) => <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />

export const AlertDialogContent = ({ className, children, ...props }) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className="fixed inset-0 isolate z-50 bg-black/40 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 dark:bg-black/60"
    />
    <AlertDialogPrimitive.Popup
      data-slot="alert-dialog-content"
      className={cn(
        "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm sm:gap-5 sm:p-6 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        className
      )}
      {...props}
    >
      {children}
    </AlertDialogPrimitive.Popup>
  </AlertDialogPrimitive.Portal>
)

export const AlertDialogHeader = ({ className, ...props }) => <div data-slot="alert-dialog-header" className={cn("flex min-w-0 flex-col gap-2", className)} {...props} />

export const AlertDialogFooter = ({ className, ...props }) => (
  <div data-slot="alert-dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
)

export const AlertDialogTitle = ({ className, ...props }) => (
  <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("text-base leading-snug font-semibold text-balance", className)} {...props} />
)

export const AlertDialogDescription = ({ className, ...props }) => (
  <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn("text-sm leading-relaxed text-pretty text-muted-foreground", className)} {...props} />
)

export const AlertDialogCancel = ({ variant = "outline", ...props }) => <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" render={<Button variant={variant} />} {...props} />
