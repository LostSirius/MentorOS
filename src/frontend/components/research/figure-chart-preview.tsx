"use client"

import type { FigureChartSpec } from "@/lib/figure-types"
import { FC, useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"

const PALETTE = [
  "#4338ca",
  "#0f766e",
  "#b45309",
  "#be123c",
  "#1d4ed8",
  "#15803d"
]

type Props = {
  spec: FigureChartSpec
  className?: string
}

/** Live preview from user-supplied chartSpec (no invented numbers). */
export const FigureChartPreview: FC<Props> = ({ spec, className }) => {
  const data = useMemo(() => spec.rows || [], [spec.rows])
  const series = spec.series || []

  if (!data.length || !series.length) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-stone-300 text-xs text-stone-400 dark:border-white/15">
        No chart data
      </div>
    )
  }

  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.25)" />
      <XAxis
        dataKey={spec.xKey}
        tick={{ fontSize: 11 }}
        label={
          spec.xLabel
            ? { value: spec.xLabel, position: "insideBottom", offset: -2, fontSize: 11 }
            : undefined
        }
      />
      <YAxis
        tick={{ fontSize: 11 }}
        label={
          spec.yLabel
            ? {
                value: spec.yLabel,
                angle: -90,
                position: "insideLeft",
                fontSize: 11
              }
            : undefined
        }
      />
      <Tooltip />
      <Legend />
    </>
  )

  return (
    <div className={className}>
      {spec.title ? (
        <h3 className="mb-2 text-center text-sm font-medium text-stone-800 dark:text-white/85">
          {spec.title}
        </h3>
      ) : null}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {spec.chartType === "line" ? (
            <LineChart data={data}>
              {common}
              {series.map((s, i) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label || s.key}
                  stroke={s.color || PALETTE[i % PALETTE.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          ) : spec.chartType === "area" ? (
            <AreaChart data={data}>
              {common}
              {series.map((s, i) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label || s.key}
                  stroke={s.color || PALETTE[i % PALETTE.length]}
                  fill={s.color || PALETTE[i % PALETTE.length]}
                  fillOpacity={0.25}
                />
              ))}
            </AreaChart>
          ) : spec.chartType === "scatter" ? (
            <ScatterChart>
              {common}
              {series.map((s, i) => (
                <Scatter
                  key={s.key}
                  name={s.label || s.key}
                  data={data}
                  fill={s.color || PALETTE[i % PALETTE.length]}
                  dataKey={s.key}
                />
              ))}
            </ScatterChart>
          ) : (
            <BarChart data={data}>
              {common}
              {series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label || s.key}
                  fill={s.color || PALETTE[i % PALETTE.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
