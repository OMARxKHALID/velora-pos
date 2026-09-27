"use client"

import { useState } from "react"
import { CalendarBlankIcon, CaretDownIcon } from "@phosphor-icons/react"
import { cn } from "cn"
import { Button } from "@/shared/components/ui/button"
import { Calendar } from "@/shared/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { Segmented } from "@/shared/components/ui/segmented"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { useMediaQuery } from "@/shared/hooks/use-media-query"
import { MAX_CUSTOM_DAYS } from "../lib/analytics"

const ranges = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
]

const shift = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

const presets = [
  { key: "week", label: "Last 7 days", pick: (today) => [shift(today, -6), today] },
  { key: "month", label: "This month", pick: (today) => [new Date(today.getFullYear(), today.getMonth(), 1), today] },
  { key: "last-month", label: "Last month", pick: (today) => [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)] },
  { key: "90d", label: "Last 90 days", pick: (today) => [shift(today, -89), today] },
  { key: "year", label: "This year", pick: (today) => [new Date(today.getFullYear(), 0, 1), today] },
]

const toDate = (iso) => (iso ? new Date(`${iso}T00:00:00`) : undefined)
const toIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
const daysIn = ({ from, to }) => Math.round((to - from) / 864e5) + 1
const withYear = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", year: "numeric" })
const monthOf = (date, back = 0) => new Date(date.getFullYear(), date.getMonth() - back, 1)
const withoutYear = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short" })
const spanText = ({ from, to }) => {
  if (from.getTime() === to.getTime()) return withYear.format(from)
  if (from.getFullYear() !== to.getFullYear()) return `${withYear.format(from)} – ${withYear.format(to)}`
  if (from.getMonth() !== to.getMonth()) return `${withoutYear.format(from)} – ${withYear.format(to)}`
  return `${from.getDate()}–${withYear.format(to)}`
}

const RangePanel = ({ draft, month, onMonthChange, onDayPick, onPreset, onCancel, onApply, last, wide }) => {
  const complete = Boolean(draft.from && draft.to)
  const tooLong = complete && daysIn(draft) > MAX_CUSTOM_DAYS
  const summary = !draft.from
    ? "Tap the first day"
    : !complete
      ? `From ${withYear.format(draft.from)}. Now tap the last day.`
      : tooLong
        ? "Pick a year or less"
        : `${spanText(draft)} · ${daysIn(draft)} ${daysIn(draft) === 1 ? "day" : "days"}`

  return (
    <div className="flex min-w-0 flex-col">
      <div role="group" aria-label="Quick ranges" className="flex flex-wrap gap-2 border-b p-3">
        {presets.map(({ key, label, pick }) => (
          <Button key={key} variant="outline" size="xs" onClick={() => onPreset(pick)} className="shrink-0 font-medium tracking-normal normal-case">
            {label}
          </Button>
        ))}
      </div>
      <Calendar
        mode="range"
        selected={draft}
        onSelect={onDayPick}
        month={month}
        onMonthChange={onMonthChange}
        numberOfMonths={wide ? 2 : 1}
        showOutsideDays={false}
        disabled={{ after: last }}
        endMonth={last}
        weekStartsOn={1}
        className={cn(!wide && "w-full")}
        classNames={wide ? undefined : { root: "w-full" }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3">
        <p aria-live="polite" className={cn("text-xs tabular-nums", tooLong ? "text-destructive" : "text-muted-foreground")}>
          {summary}
        </p>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" disabled={!complete || tooLong} onClick={onApply}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}

export const PeriodPicker = ({ range, from, to, error, today, onRangeChange, onDatesChange }) => {
  const wide = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ from: undefined, to: undefined })
  const [month, setMonth] = useState(undefined)
  const custom = range === "custom"
  const last = toDate(today) ?? new Date()
  const shown = custom && !error ? { from: toDate(from), to: toDate(to) } : null

  const handleOpenChange = (next) => {
    setOpen(next)
    if (!next) return
    const start = shown ?? { from: shift(last, -6), to: last }
    setDraft(start)
    setMonth(monthOf(start.to, wide ? 1 : 0))
  }

  const handleDayPick = (_, day) => setDraft(({ from: start, to: end }) => (!start || end ? { from: day, to: undefined } : day < start ? { from: day, to: start } : { from: start, to: day }))

  const handlePreset = (pick) => {
    const [start, end] = pick(last)
    setDraft({ from: start, to: end })
    setMonth(monthOf(end, wide ? 1 : 0))
  }

  const handleApply = () => {
    onDatesChange({ from: toIso(draft.from), to: toIso(draft.to) })
    setOpen(false)
  }

  const trigger = (
    <button
      type="button"
      aria-pressed={custom}
      aria-label={shown ? `Custom dates, ${spanText(shown)}` : "Pick custom dates"}
      className={cn(
        "flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 border px-2 text-xs font-medium whitespace-nowrap transition-colors outline-none @xs:px-3 focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11 md:flex-none md:pointer-coarse:px-4",
        custom ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
        error && "border-destructive"
      )}
      {...(wide ? {} : { onClick: () => handleOpenChange(true) })}
    >
      <CalendarBlankIcon className="hidden size-3.5 shrink-0 @xs:block" />
      <span className={cn("truncate tabular-nums", shown && "md:hidden")}>Custom</span>
      {shown && <span className="hidden truncate tabular-nums md:inline">{spanText(shown)}</span>}
      <CaretDownIcon className="hidden size-3 shrink-0 opacity-70 md:block" />
    </button>
  )
  const panel = <RangePanel draft={draft} month={month} onMonthChange={setMonth} onDayPick={handleDayPick} onPreset={handlePreset} onCancel={() => setOpen(false)} onApply={handleApply} last={last} wide={wide} />

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto">
      <div className="flex w-full min-w-0 md:w-auto">
        <Segmented label="Period" options={ranges} value={range} onChange={onRangeChange} className="shrink-0 border-r-0" />
        {wide ? (
          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger render={trigger} />
            <PopoverContent align="start" className="w-auto gap-0 p-0">
              {panel}
            </PopoverContent>
          </Popover>
        ) : (
          trigger
        )}
      </div>
      {shown && (
        <button type="button" onClick={() => handleOpenChange(true)} className="-mt-2 flex h-11 w-full md:hidden items-center justify-between gap-3 border border-t-0 bg-card px-3 text-left text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <CalendarBlankIcon className="size-4 shrink-0 text-gold" />
            <span className="truncate tabular-nums">{spanText(shown)}</span>
          </span>
          <span className="shrink-0 text-xs text-gold">Change</span>
        </button>
      )}
      {!wide && (
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent side="bottom" className="max-h-[92dvh] gap-0 overflow-y-auto p-0 pb-[env(safe-area-inset-bottom)]">
            <SheetHeader className="border-b py-3">
              <SheetTitle>Custom dates</SheetTitle>
              <SheetDescription>See how the shop did between two days.</SheetDescription>
            </SheetHeader>
            {panel}
          </SheetContent>
        </Sheet>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
