"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const config = { sales: { label: "Sales", color: "var(--chart-1)" } }
const hourLabel = (hour) => `${hour % 12 || 12}${hour < 12 ? "a" : "p"}`

export const HourlyChart = ({ data }) => (
  <ChartContainer config={config} className="aspect-auto h-64 w-full">
    <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={hourLabel} interval={1} />
      <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
      <ChartTooltip
        cursor={{ fill: "var(--muted)" }}
        content={<ChartTooltipContent labelFormatter={(_, payload) => `${hourLabel(payload?.[0]?.payload?.hour)}m – ${hourLabel((payload?.[0]?.payload?.hour ?? 0) + 1)}m`} />}
      />
      <Bar isAnimationActive={false} dataKey="sales" fill="var(--color-sales)" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ChartContainer>
)
