"use client"

import { useActionState, useRef } from "react"
import { CashRegisterIcon, CrownIcon, SignInIcon, UserGearIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/shared/components/ui/item"
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { hasFinePointer } from "@/shared/lib/pointer"
import { signIn } from "../actions"
import { roleBlurbs, roleLabels } from "../lib/roles"

const icons = { admin: CrownIcon, manager: UserGearIcon, cashier: CashRegisterIcon }

const SampleAccounts = ({ accounts, password, onPick }) => (
  <div className="space-y-2 border border-dashed p-3">
    <p className="text-xs text-muted-foreground">
      Sample accounts. The password for each is <span className="font-mono font-semibold text-foreground">{password}</span>
    </p>
    <ItemGroup role="group" aria-label="Sample accounts" className="gap-2">
      {accounts.map(({ username, name, role }) => {
        const Icon = icons[role]
        return (
          <Item key={username} variant="outline" size="xs" render={<button type="button" onClick={() => onPick(username)} />} className="flex-nowrap p-2.5 hover:border-primary touch-manipulation">
            <ItemMedia variant="icon">
              <Icon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="text-xs font-semibold tracking-label uppercase">
                {roleLabels[role]} · <span className="font-mono normal-case">{username}</span>
              </ItemTitle>
              <ItemDescription className="truncate">
                {name} · {roleBlurbs[role]}
              </ItemDescription>
            </ItemContent>
          </Item>
        )
      })}
    </ItemGroup>
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
          <FieldLabel htmlFor="username">Username or email</FieldLabel>
          <Input key={state?.username ?? ""} ref={usernameRef} id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} defaultValue={state?.username ?? ""} required autoFocus={hasFinePointer()} />
        </Field>
        <Field data-invalid={Boolean(state?.error)}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input ref={passwordRef} id="password" name="password" type="password" autoComplete="current-password" required />
          {state?.error && <FieldError errors={[{ message: state.error }]} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" pending={pending}>
          <SignInIcon />
          Sign in
        </Button>
      </form>
      {sampleAccounts && <SampleAccounts accounts={sampleAccounts.accounts} password={sampleAccounts.password} onPick={handlePick} />}
    </div>
  )
}
