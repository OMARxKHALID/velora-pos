"use client"

import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "@phosphor-icons/react"
import { SidebarMenuButton } from "@/shared/components/ui/sidebar"

export const ThemeToggle = () => {
  const { setTheme } = useTheme()

  return (
    <>
      <div className="grid grid-cols-2 gap-1 border border-sidebar-border p-1 group-data-[collapsible=icon]:hidden">
        <button
          type="button"
          onClick={() => setTheme("light")}
          className="flex h-8 items-center justify-center gap-1.5 pointer-coarse:h-11 bg-primary text-xs font-medium text-primary-foreground transition-colors dark:bg-transparent dark:text-muted-foreground dark:hover:text-foreground"
        >
          <SunIcon className="size-3.5" />
          Light
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className="flex h-8 items-center justify-center gap-1.5 pointer-coarse:h-11 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground dark:bg-primary dark:text-primary-foreground dark:hover:text-primary-foreground"
        >
          <MoonIcon className="size-3.5" />
          Dark
        </button>
      </div>
      <SidebarMenuButton
        tooltip="Toggle theme"
        className="hidden group-data-[collapsible=icon]:flex"
        onClick={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}
      >
        <SunIcon className="dark:hidden" />
        <MoonIcon className="hidden dark:block" />
        <span>Toggle theme</span>
      </SidebarMenuButton>
    </>
  )
}
