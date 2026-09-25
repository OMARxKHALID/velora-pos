"use client"

import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { splitLiveTail } from "../lib/analytics"

const config = {
  revenue: { label: "Sales", color: "var(--chart-1)" },
  profit: { label: "Profit", color: "var(--chart-2)" },
}

const metrics = Object.keys(config)
const rupees = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat("en-PK", { notation: "compact", maximumFractionDigits: 1 })
const hourLabel = (hour) => `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`

export const TrendChart = ({ data, byHour, timeZone }) => {
  const dayLabel = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", timeZone })
  const labelFor = (value) => (byHour ? hourLabel(value) : dayLabel.format(value))
  const points = splitLiveTail(data, byHour)

  return (
    <div className="space-y-2">
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <ComposedChart data={points} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="trend-revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-revenue)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-revenue)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="0" />
          <XAxis dataKey={byHour ? "hour" : "day"} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={labelFor} />
          <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value) => compact.format(value)} />
          <ChartTooltip
            cursor={{ strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => labelFor(payload?.[0]?.payload?.[byHour ? "hour" : "day"])}
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="size-2 rounded-full" style={{ backgroundColor: config[name].color }} />
                      {config[name].label}
                    </span>
                    <span className="font-medium text-foreground tabular-nums">Rs {rupees.format(value)}</span>
                  </div>
                )}
              />
            }
          />
          <Area isAnimationActive={false} dataKey="revenue" type="linear" stroke="none" fill="url(#trend-revenue-fill)" activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: "var(--color-revenue)" }} />
          <Line isAnimationActive={false} dataKey="profit" type="linear" strokeWidth={0} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: "var(--color-profit)" }} />
          {metrics.map((key) => [
            <Line key={`${key}-done`} isAnimationActive={false} dataKey={`${key}Done`} type="linear" stroke={`var(--color-${key})`} strokeWidth={2} dot={false} activeDot={false} tooltipType="none" />,
            <Line key={`${key}-live`} isAnimationActive={false} dataKey={`${key}Live`} type="linear" stroke={`var(--color-${key})`} strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} tooltipType="none" />,
          ])}
        </ComposedChart>
      </ChartContainer>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {metrics.map((key) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="h-0.5 w-3" style={{ backgroundColor: config[key].color }} />
            {config[key].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-3 border-t-2 border-dashed border-muted-foreground" />
          {byHour ? "This hour, still counting" : "Today, still counting"}
        </span>
      </div>
    </div>
  )
}
