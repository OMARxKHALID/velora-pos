"use client"

import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const GlobalError = ({ error, retry }) => {
  const handleRetry = () => retry()

  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="font-sans antialiased">
        <title>Something went wrong · Velora POS</title>
        <main className="flex min-h-dvh items-center justify-center p-6">
          <div role="alert" className="max-w-sm space-y-4 border bg-card p-6 text-center">
            <h1 className="text-lg font-bold tracking-wider uppercase">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              Velora could not start. Try again in a moment.
              {error.digest ? (
                <>
                  {" "}If it keeps happening, tell the owner the code <span className="font-mono text-foreground">{error.digest}</span>.
                </>
              ) : null}
            </p>
            <button type="button" onClick={handleRetry} className="h-9 bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80">
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}

export default GlobalError
