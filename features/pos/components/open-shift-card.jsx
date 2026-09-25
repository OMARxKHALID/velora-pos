"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { CashRegisterIcon } from "@phosphor-icons/react"
import { hasFinePointer } from "@/lib/pointer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { REGISTER_CODE } from "@/features/catalog/lib/catalog"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { newId } from "@/lib/id"
import { toPaisa } from "@/lib/money"
import { openShiftSchema } from "../schemas"

export const OpenShiftCard = ({ user }) => {
  const openShift = useLedgerStore(({ openShift }) => openShift)
  const form = useForm({ resolver: zodResolver(openShiftSchema), defaultValues: { openingCash: "10000" } })
  const [clientId] = useState(newId)

  const handleSubmit = form.handleSubmit(async ({ openingCash }) => {
    try {
      await openShift({ openingCash: toPaisa(openingCash), clientId })
      toast.success("Shift opened", { description: `Counter ${REGISTER_CODE} is ready to sell.` })
    } catch (error) {
      toast.error(error.message)
    }
  })

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="contents">
          <CardHeader>
            <div className="mb-3 flex size-12 items-center justify-center border border-primary/40 text-gold">
              <CashRegisterIcon className="size-6" />
            </div>
            <CardTitle>Open shift</CardTitle>
            <CardDescription>
              {user.name} · Counter {REGISTER_CODE}. Count the cash in the drawer before the first sale.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              name="openingCash"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Opening cash</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>Rs</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput {...field} id={field.name} inputMode="numeric" autoFocus={hasFinePointer()} aria-invalid={fieldState.invalid} />
                  </InputGroup>
                  <FieldDescription>The system compares this with the counted cash when you close the shift.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" size="lg" className="w-full">
              Open shift
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
