"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

export const ThemeProvider = ({ children, ...props }) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem
    disableTransitionOnChange
    {...props}
  >
    {children}
  </NextThemesProvider>
)
