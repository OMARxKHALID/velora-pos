"use client"

import { toast } from "sonner"
import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Segmented } from "@/shared/components/ui/segmented"
import { useUrlState } from "@/shared/hooks/use-url-state"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { LockKeyIcon } from "@phosphor-icons/react"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/shared/components/ui/input-group"
import { CASHIER_DISCOUNT_LIMITS } from "@/features/ledger/lib/rules"
import { CASH_NOTE_CHOICES, DISCOUNT_STEP_CHOICES, PHONE_REQUIRED_CHOICES, discountStepsOf } from "@/features/pricing/lib/pricing"
import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"
import { formatMoney } from "@/shared/lib/money"
import { supervisorsOf } from "@/features/staff/lib/people"
import { setSupervisorPinAction } from "@/features/staff/actions"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { Panel } from "@/shared/components/ui/panel"
import { Separator } from "@/shared/components/ui/separator"
import { NTN_PATTERN, POSID_PATTERN } from "@/features/fbr/lib/fbr"
import { ShopsSettings } from "@/features/shops/components/shops-settings"
import { PaymentsSettings } from "./payments-settings"
import { ReturnsSettings } from "./returns-settings"
import { ReceiptDesigner } from "./receipt-designer"
import { SettingToggle as Toggle } from "./setting-toggle"
import { useSettingsFor, useShopScope } from "@/features/shops/hooks/use-shop-scope"
import { ScopeBar } from "./scope-bar"
import { ALL_SHOPS } from "@/features/shops/lib/shops"

const useSyncedDraft = (saved) => {
  const [previous, setPrevious] = useState(saved)
  const [draft, setDraft] = useState(saved)
  if (saved !== previous) {
    setPrevious(saved)
    setDraft(saved)
  }
  return [draft, setDraft]
}

const digitsOnly = (value, length) => value.replace(/\D/g, "").slice(0, length)

const FbrPanel = ({ settings, update, shopId }) => {
  const shops = useLedgerStore(({ shops }) => shops)
  const registers = useLedgerStore(({ registers }) => registers)
  const open = shops.filter(({ id, active }) => active !== false && (!shopId || id === shopId))
  const missing = [
    ...open.filter(({ ntn }) => !NTN_PATTERN.test(ntn ?? "")).map(({ name }) => `${name}: NTN`),
    ...registers.filter(({ shopId, fbrPosId }) => open.some(({ id }) => id === shopId) && !POSID_PATTERN.test(fbrPosId ?? "")).map(({ code }) => `${code}: POSID`),
  ]

  const handleEnabled = (fbrEnabled) => {
    if (fbrEnabled && missing.length) {
      toast.error("Fill in the missing tax details in the Shops tab first", { description: missing.join(", ") })
      return
    }
    update({ fbrEnabled }, fbrEnabled ? "FBR reporting turned on" : "FBR reporting turned off")
  }

  return (
    <Panel title="FBR reporting" description="Report every sale, return and exchange to FBR and print its invoice number and QR code.">
      <div className="space-y-5 p-4">
        <Toggle
          on={Boolean(settings.fbrEnabled)}
          onChange={handleEnabled}
          label="Report to FBR"
          description="Fiscal numbers are simulated; nothing is sent to FBR yet."
        />
        <p className="text-xs text-muted-foreground">
          Each shop&apos;s NTN and STRN and each counter&apos;s POSID are set in the Shops tab.
          {missing.length > 0 && <span className="text-warning"> Missing: {missing.join(", ")}.</span>}
        </p>
        <Separator />
        <Toggle
          on={settings.fbrServiceFee !== false}
          onChange={(fbrServiceFee) => update({ fbrServiceFee }, fbrServiceFee ? "FBR POS fee added to each sale" : "FBR POS fee removed")}
          label="FBR POS fee (Rs 1 per invoice)"
          description="Added to the customer's total while FBR reporting is on. It is not counted as sales."
        />
      </div>
    </Panel>
  )
}

const PinRow = ({ person, hasPin }) => {
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const mismatch = confirm.length === 4 && confirm !== next
  const ready = next.length === 4 && confirm === next && !saving

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!ready) return
    setSaving(true)
    const result = await setSupervisorPinAction(person.id, next).catch(() => ({ error: "Could not reach the server. Check the connection." }))
    setSaving(false)
    if (result.error) return toast.error(result.error)
    setNext("")
    setConfirm("")
    toast.success(`PIN ${hasPin ? "changed" : "set"} for ${person.name}`)
  }

  const input = (id, label, value, setValue, error) => (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={id}
          value={value}
          onChange={(event) => setValue(digitsOnly(event.target.value, 4))}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          className="font-mono text-base tracking-[0.3em]"
          aria-invalid={Boolean(error)}
        />
      </InputGroup>
      {error && <FieldError errors={[{ message: error }]} />}
    </Field>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{person.name}</p>
        <span className={hasPin ? "text-xs text-success" : "text-xs text-warning"}>{hasPin ? "PIN set" : "No PIN yet, cannot approve"}</span>
      </div>
      <div className="grid gap-3 @lg:grid-cols-[1fr_1fr_auto] @lg:items-end">
        {input(`pin-${person.id}`, hasPin ? "New PIN" : "PIN", next, setNext, null)}
        {input(`pin-${person.id}-repeat`, "Repeat PIN", confirm, setConfirm, mismatch ? "The PINs do not match" : null)}
        <Button type="submit" size="sm" variant="outline" disabled={!ready}>
          {hasPin ? "Change PIN" : "Set PIN"}
        </Button>
      </div>
    </form>
  )
}

const SupervisorPins = ({ limitPct }) => {
  const staff = useLedgerStore(({ staff }) => staff)
  const supervisors = supervisorsOf(staff)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <LockKeyIcon className="size-4 text-gold" />
        <p className="text-sm font-medium">Supervisor approval PINs</p>
      </div>
      {supervisors.length ? (
        supervisors.map((person) => <PinRow key={person.id} person={person} hasPin={Boolean(person.hasPin)} />)
      ) : (
        <p className="text-xs text-muted-foreground">There is no supervisor yet. Add one in Staff.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Each supervisor has their own four-digit PIN, needed whenever a cashier gives a discount above {limitPct}%. The approval is
        recorded against the supervisor whose PIN was used. PINs are checked on the server and never stored in this browser.
      </p>
    </div>
  )
}

const limitOptions = CASHIER_DISCOUNT_LIMITS.map((pct) => ({ key: String(pct), label: pct ? `${pct}%` : "Always ask" }))

const keyOf = (value) => (value === null ? "off" : String(value))

const fromKey = (key) => (key === "off" ? null : Number(key))

const cashNoteOptions = CASH_NOTE_CHOICES.map((paisa) => ({ key: keyOf(paisa), label: paisa === null ? "Never" : paisa ? formatMoney(paisa) : "Any" }))

const phoneOptions = PHONE_REQUIRED_CHOICES.map((paisa) => ({ key: keyOf(paisa), label: paisa === null ? "Never" : formatMoney(paisa).replace(",000", "k") }))

const columnOptions = [3, 4, 5, 6, 7, 8].map((count) => ({ key: String(count), label: String(count) }))

const SETTINGS_TABS = ["shops", "tax", "payments", "discounts", "returns", "receipt", "counter"]

export const SettingsScreen = ({ user }) => {
  const scope = useShopScope(user)
  const shopId = scope === ALL_SHOPS ? null : scope
  const settings = useSettingsFor(scope)
  const setSettings = useLedgerStore(({ setSettings }) => setSettings)
  const [rateDraft, setRateDraft] = useSyncedDraft(settings.taxRate ? String(settings.taxRate) : "")
  const [thresholdDraft, setThresholdDraft] = useSyncedDraft(String(settings.lowStockThreshold))

  const update = (patch, message) =>
    setSettings(patch, scope).then(
      () => message && toast.success(message),
      (error) => toast.error(error.message)
    )

  const handleThreshold = (next) => setThresholdDraft(digitsOnly(next, 2))

  const handleThresholdCommit = () => {
    const value = Number(thresholdDraft)
    if (thresholdDraft !== "" && value >= 1 && value !== settings.lowStockThreshold) update({ lowStockThreshold: value })
  }

  const handleRate = (next) => {
    if (next && !/^(100(\.0{0,2})?|\d{0,2}(\.\d{0,2})?)$/.test(next)) return
    setRateDraft(next)
  }

  const handleRateCommit = () => {
    const value = rateDraft === "" ? 0 : Number(rateDraft)
    if (value !== settings.taxRate) update({ taxRate: value })
  }

  const [tab, setTab] = useUrlState("tab", "shops", SETTINGS_TABS)

  const handleCommitOnEnter = (commit) => (event) => {
    if (event.key === "Enter") commit()
  }

  const rateValid = rateDraft === "" || (Number.isFinite(Number(rateDraft)) && Number(rateDraft) >= 0 && Number(rateDraft) <= 100)

  return (
    <div className="space-y-4">
      <ScopeBar shopId={shopId} />
    <Tabs value={tab} onValueChange={setTab} className="gap-4">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto mask-r-from-95%">
        <TabsTrigger value="shops" className="flex-none">Shops</TabsTrigger>
        <TabsTrigger value="tax" className="flex-none">Tax & FBR</TabsTrigger>
        <TabsTrigger value="payments" className="flex-none">Payments</TabsTrigger>
        <TabsTrigger value="discounts" className="flex-none">Discounts & PIN</TabsTrigger>
        <TabsTrigger value="returns" className="flex-none">Returns</TabsTrigger>
        <TabsTrigger value="receipt" className="flex-none">Receipt</TabsTrigger>
        <TabsTrigger value="counter" className="flex-none">Counter & data</TabsTrigger>
      </TabsList>

      <TabsContent value="shops">
        <ShopsSettings scope={scope} />
      </TabsContent>

      <TabsContent value="tax" className="grid items-start gap-4 @4xl:grid-cols-2">
      <Panel title="Sales tax" description="Add a tax to every sale, shown on the cart and the receipt.">
        <div className="space-y-5 p-4">
          <Toggle
            on={settings.taxEnabled}
            onChange={(taxEnabled) => update({ taxEnabled }, taxEnabled ? "Sales tax turned on" : "Sales tax turned off")}
            label="Charge sales tax"
            description="When off, no tax is added to any sale."
          />
          {settings.taxEnabled && (
            <div className="space-y-4 border-t pt-4">
              <Field>
                <FieldLabel>Tax name</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    value={settings.taxLabel || ""}
                    onChange={(event) => update({ taxLabel: event.target.value })}
                    placeholder="e.g. Sales tax, GST, VAT"
                    aria-label="Tax name"
                  />
                </InputGroup>
              </Field>
              <Field data-invalid={!rateValid}>
                <FieldLabel>Tax rate</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    value={rateDraft}
                    onChange={(event) => handleRate(event.target.value)}
                    onBlur={handleRateCommit}
                    onKeyDown={handleCommitOnEnter(handleRateCommit)}
                    inputMode="decimal"
                    aria-label="Tax rate percent"
                    aria-invalid={!rateValid}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>%</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                {!rateValid && <FieldError errors={[{ message: "Enter a number between 0 and 100" }]} />}
              </Field>
              <Toggle
                on={Boolean(settings.pricesIncludeTax)}
                onChange={(pricesIncludeTax) => update({ pricesIncludeTax }, pricesIncludeTax ? "Prices now include tax" : "Tax now added on top")}
                label="Prices include tax"
                description="On: the shelf price is what the customer pays and the tax inside it is shown. Off: tax is added on top."
              />
              <FieldDescription>Applies to every new sale. Past sales keep their recorded figures.</FieldDescription>
            </div>
          )}
        </div>
      </Panel>
      <FbrPanel settings={settings} update={update} shopId={shopId} />
      </TabsContent>

      <TabsContent value="payments">
        <PaymentsSettings settings={settings} update={update} />
      </TabsContent>

      <TabsContent value="discounts" className="max-w-3xl space-y-4">
      <Panel title="Discounts" description="Choose which kinds of discount the counter can give.">
        <div className="space-y-5 p-4">
          <Toggle
            on={settings.productDiscountEnabled}
            onChange={(productDiscountEnabled) =>
              update({ productDiscountEnabled }, productDiscountEnabled ? "Product offers on" : "Product offers off")
            }
            label="Product offers"
            description="Per-product discounts you set on each product. They apply automatically at the counter."
          />
          <Separator />
          <Toggle
            on={settings.cartDiscountEnabled}
            onChange={(cartDiscountEnabled) =>
              update({ cartDiscountEnabled }, cartDiscountEnabled ? "Cart discounts on" : "Cart discounts off")
            }
            label="Discount on the whole cart"
            description="The % off chips on the cart screen. Discounts above the cashier limit still need a supervisor."
          />
          {settings.cartDiscountEnabled && (
            <Field>
              <FieldLabel>Discount buttons on the cart</FieldLabel>
              <ToggleGroup
                aria-label="Discount buttons"
                multiple
                variant="solid"
                spacing={1}
                value={discountStepsOf(settings).map(String)}
                onValueChange={(next) => next.length && next.length <= 6 && update({ discountSteps: next.map(Number).toSorted((a, b) => a - b) })}
                className="grid w-full grid-cols-4 @md:grid-cols-8"
              >
                {DISCOUNT_STEP_CHOICES.map((pct) => (
                  <ToggleGroupItem key={pct} value={String(pct)} className="font-semibold tabular-nums">
                    {pct}%
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription>Pick one to six. &quot;None&quot; is always there to take the discount off.</FieldDescription>
            </Field>
          )}
          <Separator />
          <Field>
            <FieldLabel>Cashier can give without a supervisor</FieldLabel>
            <Segmented
              label="Cashier discount limit"
              options={limitOptions}
              value={String(settings.cashierDiscountPct ?? 5)}
              onChange={(value) =>
                update({ cashierDiscountPct: Number(value) }, Number(value) ? `Cashiers can give up to ${value}% on their own` : "Every cart discount now needs a supervisor")
              }
            />
            <FieldDescription>Anything above this needs a supervisor&apos;s PIN at the counter.</FieldDescription>
          </Field>
          <Separator />
          <SupervisorPins limitPct={settings.cashierDiscountPct ?? 5} />
          <FieldDescription>
            Every discount is saved with the sale and appears on the receipt, in sales history and in the owner&apos;s reports.
          </FieldDescription>
        </div>
      </Panel>
      </TabsContent>

      <TabsContent value="returns" className="max-w-3xl space-y-4">
        <ReturnsSettings settings={settings} update={update} />
      </TabsContent>

      <TabsContent value="receipt">
        <ReceiptDesigner settings={settings} update={update} shopId={shopId} />
      </TabsContent>

      <TabsContent value="counter" className="max-w-3xl space-y-4">
      <Panel title="Checkout & counter" description="Customer details, low-stock warnings and the till layout.">
        <div className="space-y-5 p-4">
          <Toggle
            on={settings.customerInfoEnabled !== false}
            onChange={(customerInfoEnabled) =>
              update({ customerInfoEnabled }, customerInfoEnabled ? "Customer details enabled" : "Customer details disabled")
            }
            label="Customer details at checkout"
            description="Collect optional customer name and phone number during checkout for receipt printing and returns."
          />
          {settings.customerInfoEnabled !== false && (
            <Field>
              <FieldLabel>Customer phone required on sales above</FieldLabel>
              <Segmented
                label="Customer phone required"
                options={phoneOptions}
                value={keyOf(settings.phoneRequiredAbove ?? null)}
                onChange={(key) => update({ phoneRequiredAbove: fromKey(key) }, key === "off" ? "Customer phone is optional" : `Customer phone needed above ${formatMoney(fromKey(key))}`)}
              />
              <FieldDescription>For warranty claims and returns on big sales. Sales saved offline are not blocked.</FieldDescription>
            </Field>
          )}
          <Separator />
          <Toggle
            on={settings.scanBeep !== false}
            onChange={(scanBeep) => update({ scanBeep }, scanBeep ? "Scan beep on" : "Scan beep off")}
            label="Beep on scan"
            description="A short beep for each scan and a low tone when a barcode is not found, at the till, stock count and deliveries."
          />
          <Separator />
          <Field>
            <FieldLabel>Closing note needed when cash is off by more than</FieldLabel>
            <Segmented
              label="Note needed when closing a shift"
              options={cashNoteOptions}
              value={keyOf(settings.cashNoteAbove ?? null)}
              onChange={(key) => update({ cashNoteAbove: fromKey(key) }, key === "off" ? "Closing notes are optional" : "Closing note rule saved")}
            />
            <FieldDescription>
              If the counted cash is off by more than this, the cashier must count again or explain it in a note. The expected amount stays hidden until the shift is
              closed.
            </FieldDescription>
          </Field>
          <Separator />
          <div className="space-y-2">
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="lowStockThreshold">Low-stock warning threshold</FieldLabel>
                <span className="text-2xs tracking-label text-muted-foreground uppercase">Per size</span>
              </div>
              <InputGroup className="max-w-xs">
                <InputGroupInput
                  id="lowStockThreshold"
                  value={thresholdDraft}
                  onChange={(event) => handleThreshold(event.target.value)}
                  onBlur={handleThresholdCommit}
                  onKeyDown={handleCommitOnEnter(handleThresholdCommit)}
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="2"
                  className="font-mono text-sm"
                  aria-label="Low-stock threshold per size"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>in stock</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Sizes at or below this many in stock are flagged as running low in Stock, on the dashboard and when receiving a delivery.
              </FieldDescription>
            </Field>
          </div>
          <Separator />
          <Field>
            <FieldLabel>Products per row at the till</FieldLabel>
            <Segmented
              label="Products per row"
              options={columnOptions}
              value={String(settings.posColumns ?? 6)}
              onChange={(value) => update({ posColumns: Number(value) }, `Till shows up to ${value} products per row`)}
            />
            <FieldDescription>The most tiles in one row on a wide screen. Smaller screens show fewer so every tile stays easy to tap.</FieldDescription>
          </Field>
          <FieldDescription>
            Changes take effect immediately at the sales counter and on printed receipts.
          </FieldDescription>
        </div>
      </Panel>
      </TabsContent>

      <p className="text-xs text-muted-foreground">Pricing changes apply from the next sale. Past sales remain locked in the ledger.</p>
    </Tabs>
    </div>
  )
}