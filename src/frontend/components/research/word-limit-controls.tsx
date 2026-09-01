"use client"

import { WORD_LIMIT_PRESETS } from "@/lib/writing-types"
import { FC } from "react"
import { useTranslation } from "react-i18next"

type Props = {
  wordLimit: number | null
  onChange: (next: number | null) => void
  proseCount: number
  proseUnit: "words" | "chars"
  /** Show live count badge */
  showCounter?: boolean
  /** Hide the limit dropdown (counter-only) */
  counterOnly?: boolean
}

/** Length cap selector + live count for Writing / Polish. */
export const WordLimitControls: FC<Props> = ({
  wordLimit,
  onChange,
  proseCount,
  proseUnit,
  showCounter = false,
  counterOnly = false
}) => {
  const { t } = useTranslation()
  const unitLabel =
    proseUnit === "chars"
      ? t("research.writing.unitChars")
      : t("research.writing.unitWords")
  const over = Boolean(wordLimit && proseCount > wordLimit)
  const near =
    Boolean(wordLimit) &&
    !over &&
    proseCount >= Math.floor((wordLimit as number) * 0.9)
  const inPresets =
    wordLimit == null ||
    WORD_LIMIT_PRESETS.includes(wordLimit as (typeof WORD_LIMIT_PRESETS)[number])
  const selectValue = wordLimit == null ? "0" : inPresets ? String(wordLimit) : "custom"

  const counter = showCounter ? (
    <span
      className={`text-[11px] tabular-nums ${
        over
          ? "font-semibold text-rose-700 dark:text-rose-300"
          : near
            ? "font-medium text-amber-800 dark:text-amber-200"
            : "text-stone-400 dark:text-white/40"
      }`}
    >
      {wordLimit
        ? t("research.writing.wordCountOf", {
            count: proseCount,
            limit: wordLimit,
            unit: unitLabel
          })
        : t("research.writing.wordCount", {
            count: proseCount,
            unit: unitLabel
          })}
    </span>
  ) : null

  if (counterOnly) return counter

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-1.5 text-xs text-stone-600 dark:text-white/55">
        {t("research.writing.wordLimit")}
        <select
          value={selectValue}
          onChange={e => {
            const v = e.target.value
            if (v === "0") onChange(null)
            else if (v === "custom") onChange(wordLimit || 500)
            else onChange(Number(v))
          }}
          className="rounded-lg border border-stone-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-black/20"
        >
          <option value="0">{t("research.writing.wordLimitNone")}</option>
          {WORD_LIMIT_PRESETS.filter(n => n > 0).map(n => (
            <option key={n} value={n}>
              {n} {unitLabel}
            </option>
          ))}
          <option value="custom">
            {t("research.writing.wordLimitCustom")}
          </option>
        </select>
      </label>
      {selectValue === "custom" ? (
        <input
          type="number"
          min={1}
          max={200000}
          value={wordLimit ?? ""}
          onChange={e => {
            const n = Number(e.target.value)
            onChange(Number.isFinite(n) ? n : null)
          }}
          className="w-24 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-black/20"
          aria-label={t("research.writing.wordLimit")}
        />
      ) : null}
      {counter}
    </div>
  )
}
