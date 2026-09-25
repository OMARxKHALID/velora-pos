"use client"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { useLedgerStore } from "@/features/ledger/store/ledger-store-provider"
import { MAX_REFERENCE, findSaleByReference, referenceError } from "../lib/card-reference"

export const CardReferenceField = ({ id, value, onChange, onHide }) => {
  const sales = useLedgerStore(({ sales }) => sales)
  const error = referenceError(value)
  const repeat = error ? null : findSaleByReference(sales, value)

  return (
    <Field data-invalid={Boolean(error)}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>Bank slip approval / auth code</FieldLabel>
        <button type="button" onClick={onHide} className="py-0.5 text-2xs tracking-widest text-muted-foreground uppercase hover:text-foreground pointer-coarse:py-2">
          Hide
        </button>
      </div>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>Appr #</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          value={value}
          maxLength={MAX_REFERENCE + 10}
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. 048291"
          className="font-mono"
          aria-invalid={Boolean(error)}
        />
      </InputGroup>
      {error && <FieldError errors={[{ message: error }]} />}
      {repeat && <FieldDescription className="text-warning">This code was already used on receipt {repeat.number}. Check the slip.</FieldDescription>}
    </Field>
  )
}

export const AddReferenceLink = ({ onClick, children = "+ Add bank slip approval code" }) => (
  <div className="flex justify-end">
    <button type="button" onClick={onClick} className="text-2xs tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground touch-manipulation py-1 pointer-coarse:py-2">
      {children}
    </button>
  </div>
)
