import { Cinzel, Geist_Mono, Inter } from "next/font/google"
import { cn } from "cn"

import "./globals.css"
import { ThemeProvider } from "@/shared/providers/theme-provider"
import { TooltipProvider } from "@/shared/components/ui/tooltip"
import { Toaster } from "@/shared/components/ui/sonner"
import { ServiceWorkerProvider } from "@/features/offline/components/service-worker-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-display" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata = {
  title: { default: "Velora POS", template: "%s · Velora POS" },
  description: "Point of sale for Velora Group",
  applicationName: "Velora POS",
  appleWebApp: { capable: true, title: "Velora POS", statusBarStyle: "black-translucent" },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0b09" },
  ],
}

const RootLayout = ({ children }) => (
  <html
    lang="en"
    suppressHydrationWarning
    className={cn("antialiased font-sans", inter.variable, cinzel.variable, fontMono.variable)}
  >
    <body>
      <ServiceWorkerProvider>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </ServiceWorkerProvider>
    </body>
  </html>
)

export default RootLayout
