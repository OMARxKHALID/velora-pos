"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

const scriptProps = { type: typeof window === "undefined" ? "text/javascript" : "application/json" }

export const ThemeProvider = ({ children, ...props }) => (
  <NextThemesProvider
    scriptProps={scriptProps}
    attribute="class"
    defaultTheme="dark"
    enableSystem
    disableTransitionOnChange
    {...props}
  >
    {children}
  </NextThemesProvider>
)
