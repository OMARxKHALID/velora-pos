import { Cinzel, Geist_Mono, Inter } from "next/font/google"
import { cn } from "cn"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-display" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata = {
  title: "Velora POS",
  description: "Point of sale for Velora Group",
}

const RootLayout = ({ children }) => (
  <html
    lang="en"
    suppressHydrationWarning
    className={cn("antialiased font-sans", inter.variable, cinzel.variable, fontMono.variable)}
  >
    <body>
      <ThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </body>
  </html>
)

export default RootLayout
