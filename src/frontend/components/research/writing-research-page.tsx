"use client"

import { moduleAccent } from "@/lib/research-module-accents"
import { RESEARCH_DOC_ACCEPT } from "@/lib/research-uploads"
import {
  DRAFT_WRITING_MODES,
  WRITING_SECTIONS
} from "@/lib/writing-types"
import {
  IconFileText,
  IconFileUpload,
  IconLoader2,
  IconSparkles,
  IconX
} from "@tabler/icons-react"
import { FC } from "react"
import {
  ModuleExportActions,
  ModulePageHeader
} from "./module-export-actions"
import { ModulePageShell } from "./module-page-shell"
import { useWritingWorkspace } from "./use-writing-workspace"
import { WordLimitControls } from "./word-limit-controls"

/** From-scratch paper drafting: outline / section / intro / nature-style. */
export const WritingResearchPage: FC = () => {
  const w = useWritingWorkspace("outline")
  const {
    t,
    writingBundle,
    writingLoading,
    writingError,
    mode,
    setMode,
    section,
    setSection,
    publicationMode,
    setPublicationMode,
    styleTier,
    setStyleTier,
    forceEnglish,
    setForceEnglish,
    wordLimit,
    setWordLimit,
    proseCount,
    proseUnit,
    materials,
    setMaterials,
    files,
    setFiles,
    fileRef,
    proseRef,
    localProse,
    onProseChange,
    flushProseToSession,
    hasExperimentResults,
    onPickFiles,
    importContextBlurb,
    runGenerate,
    exportMarkdown,
    exportJson,
    gateTone
  } = w
  const accent = moduleAccent("writing")

  return (
    <ModulePageShell>
      <ModulePageHeader
        moduleId="writing"
        badge={
          <div
            className={`mb-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badge}`}
          >
            <IconFileText size={12} />
            {t("research.writing.badge")}
          </div>
        }
        title={t("research.writing.title")}
        subtitle={t("research.writing.subtitle")}
        actions={
          <ModuleExportActions
            onExportMd={exportMarkdown}
            onExportJson={exportJson}
            disabled={!writingBundle}
          />
        }
      />

      <div className="mt-5 rounded-3xl border border-stone-200/90 bg-white/90 p-3 dark:border-white/[0.08] dark:bg-[#12151a]/90">
        <textarea
          value={materials}
          onChange={e => setMaterials(e.target.value)}
          rows={3}
          placeholder={t("research.writing.materialsPlaceholder")}
          className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 text-sm outline-none ring-fuchsia-700/30 placeholder:text-stone-400 focus:ring-2 dark:border-white/10 dark:bg-black/20 dark:text-white/90"
        />
        {files.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] text-stone-600 dark:border-white/10 dark:bg-white/5"
              >
                {f.name}
                <button
                  type="button"
                  onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                >
                  <IconX size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 text-xs text-stone-600 dark:border-white/15 dark:text-white/55"
          >
            <IconFileUpload size={14} />
            {t("research.writing.upload")}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={RESEARCH_DOC_ACCEPT}
            className="hidden"
            onChange={e => onPickFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={importContextBlurb}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-300 px-3 text-xs text-stone-600 dark:border-white/15 dark:text-white/55"
          >
            {t("research.writing.importContext")}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-3xl border border-stone-200/90 bg-white/90 p-4 dark:border-white/[0.08] dark:bg-[#12151a]/90">
        <div className="flex flex-wrap gap-1.5">
          {DRAFT_WRITING_MODES.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                mode === m
                  ? "bg-stone-900 text-white dark:bg-fuchsia-400 dark:text-stone-950"
                  : "border border-stone-200 bg-white text-stone-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55"
              }`}
            >
              {t(`research.writing.modes.${m}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 dark:text-white/55">
          {(mode === "draft_section" || mode === "nature_style") && (
            <label className="inline-flex items-center gap-1.5">
              {t("research.writing.section")}
              <select
                value={section}
                onChange={e => setSection(e.target.value)}
                className="rounded-lg border border-stone-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-black/20"
              >
                {WRITING_SECTIONS.map(s => (
                  <option key={s} value={s}>
                    {t(`research.writing.sections.${s}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="inline-flex items-center gap-1.5">
            {t("research.writing.publication")}
            <select
              value={publicationMode}
              onChange={e =>
                setPublicationMode(e.target.value as typeof publicationMode)
              }
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-black/20"
            >
              <option value="draft">{t("research.writing.draftMode")}</option>
              <option value="final">{t("research.writing.finalMode")}</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5">
            {t("research.writing.style")}
            <select
              value={styleTier}
              onChange={e => setStyleTier(e.target.value as typeof styleTier)}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-black/20"
            >
              <option value="academic">
                {t("research.writing.styles.academic")}
              </option>
              <option value="ml_conference">
                {t("research.writing.styles.ml_conference")}
              </option>
              <option value="nature_like">
                {t("research.writing.styles.nature_like")}
              </option>
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={forceEnglish}
              onChange={e => setForceEnglish(e.target.checked)}
            />
            {t("research.writing.forceEnglish")}
          </label>
          <WordLimitControls
            wordLimit={wordLimit}
            onChange={setWordLimit}
            proseCount={proseCount}
            proseUnit={proseUnit}
          />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="min-w-0 flex-1 text-[11px] text-stone-400">
            {publicationMode === "final"
              ? t("research.writing.finalHint")
              : t("research.writing.draftHint")}
            {!hasExperimentResults
              ? ` · ${t("research.writing.noResultsHint")}`
              : ""}
          </p>

          <button
            type="button"
            disabled={writingLoading}
            onClick={runGenerate}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-fuchsia-400 dark:text-stone-950"
          >
            {writingLoading ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconSparkles size={16} />
            )}
            {writingLoading
              ? t("research.writing.running")
              : t("research.writing.generate")}
          </button>
        </div>
      </div>

      {writingError ? (
        <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {writingError}
        </div>
      ) : null}

      {!writingBundle && !writingLoading ? (
        <div className="mx-auto mt-10 max-w-lg py-10 text-center text-sm text-stone-500 dark:text-white/40">
          {t("research.writing.emptyHint")}
        </div>
      ) : null}

      {writingBundle ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
                {t("research.writing.contentTitle")}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-stone-400">
                  {writingBundle.mode}
                  {writingBundle.section ? ` · ${writingBundle.section}` : ""}
                </span>
                <WordLimitControls
                  wordLimit={wordLimit}
                  onChange={setWordLimit}
                  proseCount={proseCount}
                  proseUnit={proseUnit}
                  showCounter
                  counterOnly
                />
              </div>
            </div>
            <textarea
              ref={proseRef}
              value={localProse}
              onChange={e => onProseChange(e.target.value)}
              onBlur={() => flushProseToSession()}
              rows={18}
              className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 font-serif text-[14px] leading-7 outline-none focus:ring-2 focus:ring-fuchsia-700/30 dark:border-white/10 dark:bg-black/20 dark:text-white/90"
            />
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
              <h2 className="mb-2 text-sm font-semibold text-stone-800 dark:text-white/85">
                {t("research.writing.evidenceTitle")}
              </h2>
              {(writingBundle.evidenceMap || []).length === 0 ? (
                <p className="text-[11px] text-stone-400">
                  {t("research.writing.evidenceEmpty")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {(writingBundle.evidenceMap || []).map(e => (
                    <li
                      key={e.id}
                      className="rounded-xl border border-fuchsia-800/10 bg-fuchsia-700/[0.04] p-2.5 text-[11px] dark:border-fuchsia-400/15"
                    >
                      <div className="font-mono text-[10px] text-fuchsia-800 dark:text-fuchsia-300">
                        {e.id} · {e.level}
                      </div>
                      <div className="mt-0.5 font-medium text-stone-800 dark:text-white/80">
                        {e.source}
                      </div>
                      <div className="mt-1 text-stone-500">{e.supports}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
              <h2 className="mb-2 text-sm font-semibold text-stone-800 dark:text-white/85">
                {t("research.writing.gatesTitle")}
              </h2>
              <ul className="space-y-1.5">
                {(writingBundle.gates || []).map((g, i) => (
                  <li
                    key={`${g.id}-${i}`}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${gateTone(g.severity)}`}
                  >
                    <span className="font-semibold">{g.severity}</span> · {g.message}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      ) : null}
    </ModulePageShell>
  )
}
