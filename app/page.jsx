import { redirect } from "next/navigation"
import { VeloraLogo } from "@/components/layout/velora-logo"
import { SignInForm } from "@/features/auth/components/sign-in-form"
import { homeFor } from "@/features/auth/lib/roles"
import { getSession } from "@/features/auth/server/session"
import { SAMPLE_TEAM } from "@/features/sample-data/lib/team"
import { appEnv, authEnv } from "@/lib/env"

const sampleAccounts = () =>
  appEnv().SAMPLE_DATA
    ? { password: authEnv().SAMPLE_PASSWORD, accounts: Object.values(SAMPLE_TEAM).map(({ username, name, role }) => ({ username, name, role })) }
    : null

const LoginPage = async () => {
  const user = await getSession()
  if (user) redirect(homeFor(user.role))

  return (
    <main className="grid min-h-svh w-full overflow-x-hidden lg:grid-cols-2">
      <section className="dark relative hidden flex-col justify-between overflow-hidden border-r border-primary/30 bg-background bg-[radial-gradient(ellipse_at_85%_10%,color-mix(in_oklab,var(--primary)_20%,transparent),transparent_55%)] p-12 text-foreground lg:flex">
        <span className="pointer-events-none absolute -right-16 -bottom-32 font-heading text-[34rem] leading-none font-bold text-primary/[0.06] select-none">
          V
        </span>
        <div className="pointer-events-none absolute inset-6 border border-primary/15" />
        <VeloraLogo className="relative" />
        <div className="relative space-y-6">
          <p className="bg-linear-to-b from-[#f5d77a] via-[#d4af37] to-[#8a6a1f] bg-clip-text font-heading text-5xl leading-tight font-bold tracking-wider text-transparent">
            Every item,
            <br />
            every sale,
            <br />
            accounted for.
          </p>
          <div className="flex max-w-md items-center gap-4">
            <span className="h-px flex-1 bg-linear-to-r from-transparent to-primary/60" />
            <p className="text-xs tracking-[0.35em] text-gold uppercase">Fashion · Footwear · Lifestyle</p>
            <span className="h-px flex-1 bg-linear-to-l from-transparent to-primary/60" />
          </div>
        </div>
        <p className="relative text-xs text-muted-foreground">Velora Group © 2026</p>
      </section>

      <section className="flex min-w-0 w-full items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)] px-4 py-8 sm:p-8 md:p-12">
        <div className="w-full max-w-md space-y-6 sm:space-y-8 min-w-0">
          <div className="lg:hidden">
            <VeloraLogo />
          </div>
          <div className="space-y-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-wider uppercase">Sign in</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Use the username and password the owner gave you.</p>
          </div>
          <SignInForm sampleAccounts={sampleAccounts()} />
          <p className="text-xs text-muted-foreground">Forgot your password? Ask the owner to set a new one in Staff.</p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
