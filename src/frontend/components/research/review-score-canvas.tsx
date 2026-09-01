"use client"

import {
  REVIEW_DIMENSIONS,
  severityCounts,
  type ReviewDimension,
  type ReviewReport
} from "@/lib/review-types"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer
} from "recharts"

type Props = {
  report: ReviewReport
}

const DIM_LABEL_KEY: Record<ReviewDimension, string> = {
  macro_logic: "research.review.dims.macro_logic",
  writing_detail: "research.review.dims.writing_detail",
  grammar: "research.review.dims.grammar",
  latex_format: "research.review.dims.latex_format",
  figure_quality: "research.review.dims.figure_quality"
}

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "#e11d48",
  MAJOR: "#d97706",
  MINOR: "#0284c7",
  INFO: "#78716c"
}

function scoreTone(score: number): string {
  if (score >= 8) return "text-emerald-700 dark:text-emerald-300"
  if (score >= 6) return "text-amber-700 dark:text-amber-300"
  return "text-rose-700 dark:text-rose-300"
}

function decisionBarClass(tendency?: string): string {
  if (tendency === "accept") return "bg-emerald-600"
  if (tendency === "reject") return "bg-rose-600"
  return "bg-amber-500"
}

/** Canvas-style ensemble visualization for review scores & outline. */
export const ReviewScoreCanvas: FC<Props> = ({ report }) => {
  const { t } = useTranslation()
  const overall = report.overall ?? 0
  const scores = report.dimensionScores || {}
  const counts = useMemo(
    () => severityCounts(report.checklist || []),
    [report.checklist]
  )
  const totalIssues =
    counts.CRITICAL + counts.MAJOR + counts.MINOR + counts.INFO || 1

  const radarData = useMemo(
    () =>
      REVIEW_DIMENSIONS.map(dim => ({
        dim,
        label: t(DIM_LABEL_KEY[dim]),
        score: scores[dim] ?? 0
      })),
    [scores, t]
  )

  const fo = report.feedbackOutline
  const readiness = report.readiness || "green"

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-stone-200/90 bg-[#f7f5f1] dark:border-white/[0.07] dark:bg-[#0f1216]">
      {/* Hero strip */}
      <div className="grid gap-0 border-b border-stone-200/80 dark:border-white/[0.06] lg:grid-cols-[200px_1fr_1fr]">
        <div className="flex flex-col items-center justify-center gap-2 border-b border-stone-200/80 p-5 lg:border-b-0 lg:border-r dark:border-white/[0.06]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            {t("research.review.overall")}
          </div>
          <div className={`font-serif text-5xl font-semibold tabular-nums ${scoreTone(overall)}`}>
            {report.overall ?? "—"}
            <span className="text-lg font-normal text-stone-400">/10</span>
          </div>
          <div
            className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ${
              readiness === "red"
                ? "bg-rose-600"
                : readiness === "yellow"
                  ? "bg-amber-500 text-stone-950"
                  : "bg-emerald-600"
            }`}
          >
            {t(`research.review.readiness.${readiness}`)}
          </div>
        </div>

        <div className="border-b border-stone-200/80 p-4 lg:border-b-0 lg:border-r dark:border-white/[0.06]">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            {t("research.review.decision")}
          </div>
          <div className="mb-3 text-sm font-semibold text-stone-800 dark:text-white/85">
            {report.decisionTendency
              ? t(`research.review.decisions.${report.decisionTendency}`)
              : "—"}
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-stone-200/80 dark:bg-white/10">
            <div
              className={`h-full transition-all ${decisionBarClass(report.decisionTendency)}`}
              style={{
                width:
                  report.decisionTendency === "accept"
                    ? "82%"
                    : report.decisionTendency === "reject"
                      ? "78%"
                      : "55%"
              }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-stone-500 dark:text-white/45">
            {t("research.review.canvasDecisionHint")}
          </p>
        </div>

        <div className="p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            {t("research.review.severityMix")}
          </div>
          <div className="space-y-2">
            {(["CRITICAL", "MAJOR", "MINOR", "INFO"] as const).map(sev => {
              const n = counts[sev]
              const pct = Math.round((n / totalIssues) * 100)
              return (
                <div key={sev} className="flex items-center gap-2 text-[11px]">
                  <span className="w-16 shrink-0 font-medium text-stone-600 dark:text-white/55">
                    {sev}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200/70 dark:bg-white/10">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${n ? Math.max(pct, 6) : 0}%`,
                        background: SEV_COLORS[sev]
                      }}
                    />
                  </div>
                  <span className="w-6 text-right tabular-nums text-stone-500">
                    {n}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Radar + ranked weaknesses */}
      <div className="grid gap-0 border-b border-stone-200/80 dark:border-white/[0.06] lg:grid-cols-[1.1fr_1fr]">
        <div className="border-b border-stone-200/80 p-4 lg:border-b-0 lg:border-r dark:border-white/[0.06]">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            {t("research.review.dimensionRadar")}
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="currentColor" className="text-stone-300 dark:text-white/15" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: "currentColor", fontSize: 10 }}
                  className="text-stone-500 dark:text-white/50"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 10]}
                  tickCount={6}
                  tick={{ fill: "currentColor", fontSize: 9 }}
                  className="text-stone-400 dark:text-white/30"
                />
                <Radar
                  name="score"
                  dataKey="score"
                  stroke="#9f1239"
                  fill="#9f1239"
                  fillOpacity={0.28}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            {t("research.review.rankedTitle")}
          </div>
          {report.rankedWeaknesses?.length ? (
            <ol className="space-y-2">
              {report.rankedWeaknesses.slice(0, 6).map((w, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 rounded-xl border border-stone-200/70 bg-white/70 px-3 py-2 text-[12px] leading-snug text-stone-700 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-white/70"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-rose-800/10 text-[10px] font-bold text-rose-800 dark:bg-rose-400/15 dark:text-rose-200">
                    {i + 1}
                  </span>
                  <span>{w}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[12px] text-stone-400">
              {t("research.review.rankedEmpty")}
            </p>
          )}
        </div>
      </div>

      {/* Liang outline cards */}
      {fo ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <OutlineCard
            title={t("research.review.outline.significance")}
            items={fo.significanceNovelty}
            accent="teal"
          />
          <OutlineCard
            title={t("research.review.outline.accept")}
            items={fo.acceptReasons}
            accent="emerald"
          />
          <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-3 dark:border-white/[0.06] dark:bg-white/[0.03] sm:col-span-2">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
              {t("research.review.outline.reject")}
            </div>
            {(fo.rejectReasons || []).length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {(fo.rejectReasons || []).slice(0, 4).map((r, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-rose-500/15 bg-rose-500/[0.04] px-3 py-2"
                  >
                    <div className="text-[12px] font-semibold text-rose-900 dark:text-rose-200">
                      {i + 1}. {r.title}
                    </div>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-stone-600 dark:text-white/60">
                      {(r.details || []).slice(0, 4).map((d, j) => (
                        <li key={j}>· {d}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-stone-400">
                {t("research.review.outline.rejectEmpty")}
              </p>
            )}
          </div>
          <OutlineCard
            title={t("research.review.outline.suggestions")}
            items={fo.suggestions}
            accent="sky"
            className="sm:col-span-2"
          />
        </div>
      ) : null}

      <div className="border-t border-stone-200/80 px-4 py-2 text-[10px] text-stone-400 dark:border-white/[0.06]">
        {t("research.review.canvasSource")}
      </div>
    </div>
  )
}

function OutlineCard({
  title,
  items,
  accent,
  className = ""
}: {
  title: string
  items?: string[]
  accent: "teal" | "emerald" | "sky"
  className?: string
}) {
  if (!items?.length) return null
  const border =
    accent === "teal"
      ? "border-teal-600/15 bg-teal-600/[0.04]"
      : accent === "emerald"
        ? "border-emerald-600/15 bg-emerald-600/[0.04]"
        : "border-sky-600/15 bg-sky-600/[0.04]"
  return (
    <div
      className={`rounded-2xl border border-stone-200/80 bg-white/80 p-3 dark:border-white/[0.06] dark:bg-white/[0.03] ${className}`}
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.slice(0, 6).map((item, i) => (
          <li
            key={i}
            className={`rounded-lg border px-2.5 py-1.5 text-[12px] leading-snug text-stone-700 dark:text-white/70 ${border}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
