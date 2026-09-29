"use client"

import { Button } from "@/shared/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/shared/components/ui/input-group"
import { useDeferredValue } from "react"
import { useQuery } from "@tanstack/react-query"
import { getJson, queryString } from "@/shared/lib/get-json"
import { MAX_REFERENCE, referenceError } from "../lib/card-reference"

export const CardReferenceField = ({ id, value, onChange, onHide }) => {
  const error = referenceError(value)
  const reference = useDeferredValue(value.trim())
  const { data } = useQuery({
    queryKey: ["card-reference", reference],
    queryFn: ({ signal }) => getJson(`/api/sales/lookup?${queryString({ reference })}`, { signal }),
    enabled: !error && reference.length >= 3,
  })
  const repeat = !error && reference.length >= 3 ? data?.sale : null

  return (
    <Field data-invalid={Boolean(error)}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>Bank slip approval / auth code</FieldLabel>
        <Button type="button" variant="text" size="inline" onClick={onHide} className="text-2xs font-normal tracking-label uppercase">
          Hide
        </Button>
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
    <Button type="button" variant="text" size="inline" onClick={onClick} className="py-1 text-2xs font-normal tracking-label uppercase touch-manipulation">
      {children}
    </Button>
  </div>
)
