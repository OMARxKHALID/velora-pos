"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { MoonIcon, SunIcon } from "@phosphor-icons/react"
import { SidebarMenuButton } from "@/shared/components/ui/sidebar"
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"

const subscribe = () => () => {}

const itemClass = "h-8 font-medium tracking-normal normal-case pointer-coarse:h-11"

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme()
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false)

  return (
    <>
      <ToggleGroup
        aria-label="Theme"
        spacing={1}
        value={hydrated && resolvedTheme ? [resolvedTheme] : []}
        onValueChange={([next]) => next && setTheme(next)}
        className="grid w-full grid-cols-2 border border-sidebar-border p-1 group-data-[collapsible=icon]:hidden"
      >
        <ToggleGroupItem value="light" className={`${itemClass} bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground aria-pressed:bg-primary dark:bg-transparent dark:text-muted-foreground dark:hover:bg-transparent dark:hover:text-foreground`}>
          <SunIcon />
          Light
        </ToggleGroupItem>
        <ToggleGroupItem value="dark" className={`${itemClass} text-muted-foreground hover:bg-transparent aria-pressed:bg-transparent dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground dark:aria-pressed:bg-primary`}>
          <MoonIcon />
          Dark
        </ToggleGroupItem>
      </ToggleGroup>
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
