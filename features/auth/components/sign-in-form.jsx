"use client"

import { useActionState, useRef } from "react"
import { CashRegisterIcon, CrownIcon, SignInIcon, UserGearIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signIn } from "../actions"
import { roleBlurbs, roleLabels } from "../lib/roles"

const icons = { admin: CrownIcon, manager: UserGearIcon, cashier: CashRegisterIcon }

const SampleAccounts = ({ accounts, password, onPick }) => (
  <div className="space-y-2 border border-dashed p-3">
    <p className="text-xs text-muted-foreground">
      Sample accounts. The password for each is <span className="font-mono font-semibold text-foreground">{password}</span>
    </p>
    <div className="grid gap-2">
      {accounts.map(({ username, name, role }) => {
        const Icon = icons[role]
        return (
          <button
            key={username}
            type="button"
            onClick={() => onPick(username)}
            className="flex min-w-0 items-center gap-3 border bg-card p-2.5 text-left transition-colors hover:border-primary touch-manipulation"
          >
            <span className="flex size-9 shrink-0 items-center justify-center border border-primary/40 text-gold">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold tracking-wider uppercase">
                {roleLabels[role]} · <span className="font-mono normal-case">{username}</span>
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {name} · {roleBlurbs[role]}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  </div>
)

export const SignInForm = ({ sampleAccounts }) => {
  const [state, action, pending] = useActionState(signIn, null)
  const usernameRef = useRef(null)
  const passwordRef = useRef(null)

  const handlePick = (username) => {
    usernameRef.current.value = username
    passwordRef.current.value = sampleAccounts.password
    passwordRef.current.form.requestSubmit()
  }

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4">
        <Field data-invalid={Boolean(state?.error)}>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input ref={usernameRef} id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} defaultValue={state?.username ?? ""} required autoFocus />
        </Field>
        <Field data-invalid={Boolean(state?.error)}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input ref={passwordRef} id="password" name="password" type="password" autoComplete="current-password" required />
          {state?.error && <FieldError errors={[{ message: state.error }]} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          <SignInIcon />
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      {sampleAccounts && <SampleAccounts accounts={sampleAccounts.accounts} password={sampleAccounts.password} onPick={handlePick} />}
    </div>
  )
}
