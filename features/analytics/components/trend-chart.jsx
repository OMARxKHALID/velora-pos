"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const config = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  profit: { label: "Profit", color: "var(--chart-2)" },
}

const dayLabel = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short" })
const rupees = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat("en-PK", { notation: "compact", maximumFractionDigits: 1 })
const hourLabel = (hour) => `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`

export const TrendChart = ({ data, byHour }) => {
  const labelFor = (value) => (byHour ? hourLabel(value) : dayLabel.format(value))

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <LineChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
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
        <ChartLegend content={<ChartLegendContent />} />
        <Line isAnimationActive={false} dataKey="revenue" type="linear" stroke="var(--color-revenue)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
        <Line isAnimationActive={false} dataKey="profit" type="linear" stroke="var(--color-profit)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }} />
      </LineChart>
    </ChartContainer>
  )
}
