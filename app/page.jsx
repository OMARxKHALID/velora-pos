import { ArrowRightIcon, CashRegisterIcon, CrownIcon, UserGearIcon } from "@phosphor-icons/react/ssr"
import { Button } from "@/components/ui/button"
import { VeloraLogo } from "@/components/layout/velora-logo"
import { loginAs } from "@/features/auth/actions"
import { demoUsers } from "@/features/auth/lib/demo-users"

const roles = [
  { key: "admin", icon: CrownIcon, blurb: "Sees every shop, analytics, stock and fraud signals." },
  { key: "manager", icon: UserGearIcon, blurb: "Runs Velora Shoes: stock, refunds, shifts, reports." },
  { key: "cashier", icon: CashRegisterIcon, blurb: "Sells only: scan, take payment, open and close shift." },
]

const LoginPage = () => (
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
          <p className="text-sm text-muted-foreground">Demo mode: pick a role to explore the system.</p>
        </div>
        <div className="space-y-3">
          {roles.map(({ key, icon: Icon, blurb }) => (
            <form key={key} action={loginAs.bind(null, key)}>
              <button
                type="submit"
                className="group flex w-full items-center gap-4 border bg-card p-4 text-left transition-colors hover:border-primary"
              >
                <span className="flex size-11 shrink-0 items-center justify-center border border-primary/40 text-gold">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold tracking-widest uppercase">{key}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {demoUsers[key].name} · {blurb}
                  </span>
                </span>
                <ArrowRightIcon className="size-4 text-muted-foreground transition-colors group-hover:text-gold" />
              </button>
            </form>
          ))}
        </div>
        <Button variant="link" className="px-0 text-muted-foreground" disabled>
          Real login with email and password comes in Phase 2
        </Button>
      </div>
    </section>
  </main>
)

export default LoginPage
