import Link from "next/link"
import { CompassIcon } from "@phosphor-icons/react/ssr"
import { buttonVariants } from "@/shared/components/ui/button"

export const metadata = { title: "Page not found" }

const NotFound = () => (
  <main className="flex min-h-dvh items-center justify-center p-6">
    <div className="max-w-sm space-y-4 border bg-card p-6 text-center">
      <CompassIcon className="mx-auto size-10 text-gold" />
      <h1 className="font-heading text-lg font-bold tracking-wider uppercase">Page not found</h1>
      <p className="text-sm text-muted-foreground">This address is not part of Velora POS. Check the link, or go back to the start.</p>
      <Link href="/" className={buttonVariants()}>
        Go to the start
      </Link>
    </div>
  </main>
)

export default NotFound
