"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { cn } from "cn"
import { CashRegisterIcon } from "@phosphor-icons/react"
import { hasFinePointer } from "@/lib/pointer"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Segmented } from "@/components/ui/segmented"
import { useStaffName } from "@/features/demo/hooks/use-directory"
import { useDemoStore } from "@/features/demo/store/demo-store-provider"
import { formatDateTime, startOfToday } from "@/lib/dates"
import { formatMoney, sumBy, toPaisa } from "@/lib/money"
import { openShiftSchema } from "../schemas"

const LastShift = ({ registerId, shopId }) => {
  const shifts = useDemoStore(({ shifts }) => shifts)
  const sales = useDemoStore(({ sales }) => sales)
  const nameOf = useStaffName()
  const last = shifts
    .filter(
      ({ status, registerId: shiftRegister }) =>
        status === "closed" && shiftRegister === registerId
    )
    .at(-1)
  const today = sales.filter((sale) => sale.shopId === shopId && sale.soldAt >= startOfToday())

  if (!last)
    return (
      <p className="text-center text-xs text-muted-foreground">
        First shift on this counter. Welcome.
      </p>
    )

  const lastSales = sales.filter(({ shiftId }) => shiftId === last.id)
  const facts = [
    [
      "Last shift",
      `${nameOf(last.cashierId)} · closed ${formatDateTime(last.closedAt)}`,
    ],
    [
      "It sold",
      `${lastSales.length} ${lastSales.length === 1 ? "sale" : "sales"} · ${formatMoney(sumBy(lastSales, ({ total }) => total))}`,
    ],
    [
      "Drawer",
      last.difference === 0
        ? "Counted exact"
        : `${formatMoney(Math.abs(last.difference))} ${last.difference < 0 ? "short" : "over"}`,
    ],
    [
      "Today so far",
      `${today.length} ${today.length === 1 ? "sale" : "sales"} · ${formatMoney(sumBy(today, ({ total }) => total))}`,
    ],
  ]

  return (
    <dl className="grid grid-cols-2 border bg-card/60 text-xs">
      {facts.map(([label, value], index) => (
        <div
          key={label}
          className={cn(
            "space-y-0.5 px-4 py-3",
            index % 2 === 0 && "border-r",
            index < 2 && "border-b"
          )}
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd
            className={cn(
              "font-medium",
              label === "Drawer" && last.difference < 0 && "text-destructive"
            )}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export const OpenShiftCard = ({ user, counter }) => {
  const { register, registers, choose, shopId } = counter
  const openShift = useDemoStore(({ openShift }) => openShift)
  const form = useForm({
    resolver: zodResolver(openShiftSchema),
    defaultValues: { openingCash: "10000" },
  })

  const handleSubmit = form.handleSubmit(({ openingCash }) => {
    try {
      openShift({ cashierId: user.id, openingCash: toPaisa(openingCash), shopId, registerId: register.id })
      toast.success("Shift opened", {
        description: `Counter ${register.code} is ready to sell.`,
      })
    } catch (error) {
      toast.error(error.message)
    }
  })

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="w-full max-w-md space-y-4">
        <Card className="w-full">
          <form onSubmit={handleSubmit} className="contents">
            <CardHeader>
              <div className="mb-3 flex size-12 items-center justify-center border border-primary/40 text-gold">
                <CashRegisterIcon className="size-6" />
              </div>
              <CardTitle>Open shift</CardTitle>
              <CardDescription>
                {user.name} · Counter {register.code}. Count the cash in the
                drawer before the first sale.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {registers.length > 1 && (
                <Field>
                  <FieldLabel>Counter</FieldLabel>
                  <Segmented label="Counter" options={registers.map(({ id, code }) => ({ key: id, label: code }))} value={register.id} onChange={choose} />
                  <FieldDescription>This device remembers the counter you pick.</FieldDescription>
                </Field>
              )}
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
                      <InputGroupInput
                        {...field}
                        id={field.name}
                        inputMode="numeric"
                        autoFocus={hasFinePointer()}
                        aria-invalid={fieldState.invalid}
                      />
                    </InputGroup>
                    <FieldDescription>
                      The system compares this with the counted cash when you
                      close the shift.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
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
        <LastShift registerId={register.id} shopId={shopId} />
      </div>
    </div>
  )
}
