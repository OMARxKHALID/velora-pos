import { ArrowRightIcon, CashRegisterIcon, CrownIcon, ProhibitIcon, UserGearIcon } from "@phosphor-icons/react/ssr"
import { cn } from "cn"
import { VeloraLogo } from "@/components/layout/velora-logo"
import { loginAs } from "@/features/auth/actions"
import { demoUsers, roleLabels } from "@/features/auth/lib/demo-users"
import { getDisabledStaff } from "@/features/auth/lib/session"

const roles = [
  { key: "admin", icon: CrownIcon, blurb: "Watches sales, profit, stock and staff. Does not sell." },
  { key: "manager", icon: UserGearIcon, blurb: "Runs the shop: approves returns, manages stock and catalog." },
  { key: "cashier", icon: CashRegisterIcon, blurb: "Processes checkout and counts cash at closing." },
]

const LoginPage = async ({ searchParams }) => {
  const { blocked } = await searchParams
  const disabled = await getDisabledStaff()

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="dark relative hidden flex-col justify-between overflow-hidden border-r border-[#d4af37]/30 bg-[radial-gradient(ellipse_at_85%_10%,#d4af3733,transparent_55%),radial-gradient(ellipse_at_10%_95%,#8a6a1f40,transparent_50%),linear-gradient(160deg,#1f1a0f_0%,#0c0b09_55%,#17130b_100%)] p-12 text-[#f5f1e6] lg:flex">
        <span className="pointer-events-none absolute -right-16 -bottom-32 font-heading text-[34rem] leading-none font-bold text-[#d4af37]/[0.06] select-none">
          V
        </span>
        <div className="pointer-events-none absolute inset-6 border border-[#d4af37]/15" />
        <VeloraLogo className="relative" />
        <div className="relative space-y-6">
          <p className="bg-linear-to-b from-[#f5d77a] via-[#d4af37] to-[#8a6a1f] bg-clip-text font-heading text-5xl leading-tight font-bold tracking-wider text-transparent">
            Every pair,
            <br />
            every sale,
            <br />
            accounted for.
          </p>
          <div className="flex max-w-md items-center gap-4">
            <span className="h-px flex-1 bg-linear-to-r from-transparent to-[#d4af37]/60" />
            <p className="text-xs tracking-[0.35em] text-[#e6c766] uppercase">Fashion · Footwear · Lifestyle</p>
            <span className="h-px flex-1 bg-linear-to-l from-transparent to-[#d4af37]/60" />
          </div>
        </div>
        <p className="relative text-xs text-[#a8a091]">Velora Group © 2026 · Demo build</p>
      </section>

      <section className="flex items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--accent),transparent_60%)] p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <VeloraLogo />
          </div>
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-semibold tracking-wider uppercase">Sign in</h1>
            <p className="text-sm text-muted-foreground">Demo: choose who you are.</p>
          </div>
          {blocked && (
            <p role="alert" className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              This person&apos;s access has been turned off by the owner.
            </p>
          )}
          <div className="space-y-3">
            {roles.map(({ key, icon: Icon, blurb }) => {
              const off = disabled.includes(demoUsers[key].id)
              return (
                <form key={key} action={loginAs.bind(null, key)}>
                  <button
                    type="submit"
                    disabled={off}
                    className={cn(
                      "group flex w-full items-center gap-4 border bg-card p-4 text-left transition-colors",
                      off ? "cursor-not-allowed opacity-50" : "hover:border-primary"
                    )}
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center border border-primary/40 text-gold">
                      {off ? <ProhibitIcon className="size-5 text-destructive" /> : <Icon className="size-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold tracking-widest uppercase">{roleLabels[key]}</span>
                      <span className="block text-xs text-muted-foreground">
                        {demoUsers[key].name} · {off ? "Access turned off" : blurb}
                      </span>
                    </span>
                    {!off && <ArrowRightIcon className="size-4 text-muted-foreground transition-colors group-hover:text-gold" />}
                  </button>
                </form>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">Velora POS Demo · Select any role to begin.</p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
