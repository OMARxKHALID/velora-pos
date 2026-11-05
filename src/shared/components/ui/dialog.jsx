"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/shared/components/ui/button"
import { XIcon } from "@phosphor-icons/react"

const Dialog = ({
  ...props
}) => {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

const DialogPortal = ({
  ...props
}) => {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

const DialogClose = ({
  ...props
}) => {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

const DialogOverlay = ({
  className,
  ...props
}) => {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/40 transition-opacity duration-150 ease-snappy supports-backdrop-filter:backdrop-blur-sm data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-100 dark:bg-black/60",
        className
      )}
      {...props}
    />
  )
}

const DialogContent = ({
  className,
  bodyClassName,
  children,
  showCloseButton = true,
  flush = false,
  instant = false,
  ...props
}) => {
  return (
    <DialogPortal>
      <DialogOverlay className={cn(instant && "transition-none")} />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-none bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 transition-[opacity,scale] duration-150 ease-snappy outline-none sm:max-w-md data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-100",
          instant && "transition-none",
          className
        )}
        {...props}
      >
        <div
          data-slot="dialog-body"
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain [--dialog-pad:--spacing(4)] sm:[--dialog-pad:--spacing(6)]",
            flush
              ? "flex flex-col overflow-hidden"
              : "grid grid-cols-[minmax(0,1fr)] content-start gap-4 p-(--dialog-pad) sm:gap-5 *:min-w-0",
            bodyClassName
          )}
        >
          {children}
        </div>
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3 bg-secondary sm:top-5 sm:right-5"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

const DialogHeader = ({
  className,
  ...props
}) => {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex min-w-0 flex-col gap-2 pr-10", className)}
      {...props}
    />
  )
}

const DialogFooter = ({
  className,
  showCloseButton = false,
  sticky = false,
  children,
  ...props
}) => {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        sticky && "sticky -bottom-(--dialog-pad) z-10 -mx-(--dialog-pad) -mb-(--dialog-pad) border-t bg-popover p-(--dialog-pad)",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

const DialogTitle = ({
  className,
  ...props
}) => {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-base leading-snug font-semibold text-balance",
        className
      )}
      {...props}
    />
  )
}

const DialogDescription = ({
  className,
  ...props
}) => {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "mt-0.5 text-sm leading-relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
}
