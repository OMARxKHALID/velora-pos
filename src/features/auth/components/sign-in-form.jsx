"use client"

import { useActionState, useEffect, useRef } from "react"
import { SignInIcon } from "@phosphor-icons/react"
import { Button } from "@/shared/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field"
import { Input } from "@/shared/components/ui/input"
import { hasFinePointer } from "@/shared/lib/pointer"
import { signIn } from "../actions"

export const SignInForm = () => {
  const [state, action, pending] = useActionState(signIn, null)
  const usernameRef = useRef(null)

  useEffect(() => {
    if (hasFinePointer()) usernameRef.current?.focus()
  }, [])

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4">
        <Field data-invalid={Boolean(state?.error)}>
          <FieldLabel htmlFor="username">Username or email</FieldLabel>
          <Input key={state?.username ?? ""} ref={usernameRef} id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} defaultValue={state?.username ?? ""} required />
        </Field>
        <Field data-invalid={Boolean(state?.error)}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
          {state?.error && <FieldError errors={[{ message: state.error }]} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" pending={pending}>
          <SignInIcon />
          Sign in
        </Button>
      </form>
    </div>
  )
}
