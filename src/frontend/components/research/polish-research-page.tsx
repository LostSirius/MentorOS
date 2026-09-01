"use client"

import { moduleAccent } from "@/lib/research-module-accents"
import { RESEARCH_DOC_ACCEPT } from "@/lib/research-uploads"
import { POLISH_WRITING_MODES } from "@/lib/writing-types"
import {
  IconCheck,
  IconFileUpload,
  IconGitCompare,
  IconLoader2,
  IconPencil,
  IconPlus,
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

/** Polish / revise an existing draft: polish, feedback revise, scoped revise. */
export const PolishResearchPage: FC = () => {
  const w = useWritingWorkspace("polish", { apiPath: "/api/polish" })
  const accent = moduleAccent("polish")
  const {
    t,
    writingBundle,
    writingLoading,
    writingError,
    mode,
    setMode,
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
    fileRef,
    proseRef,
    localProse,
    onProseChange,
    flushProseToSession,
    commentsRaw,
    setCommentsRaw,
    comments,
    scopedTarget,
    setScopedTarget,
    scopedInstruction,
    setScopedInstruction,
    preserveClaims,
    setPreserveClaims,
    compareA,
    setCompareA,
    compareB,
    setCompareB,
    showCompare,
    setShowCompare,
    history,
    hasExperimentResults,
    versionById,
    onPickFiles,
    parseComments,
    captureSelection,
    saveSnapshot,
    restoreVersion,
    runGenerate,
    setDiffAccepted,
    exportMarkdown,
    exportJson,
    seedDraftFromPaste,
    gateTone
  } = w

  const bundleA = versionById(compareA)
  const bundleB = versionById(compareB)

  return (
    <ModulePageShell>
      <ModulePageHeader
        moduleId="polish"
        badge={
          <div
            className={`mb-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badge}`}
          >
            <IconPencil size={12} />
            {t("research.polish.badge")}
          </div>
        }
        title={t("research.polish.title")}
        subtitle={t("research.polish.subtitle")}
        actions={
          <>
            {writingBundle ? (
              <>
                <button
                  type="button"
                  onClick={saveSnapshot}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300/80 bg-white/80 px-3 py-2 text-xs font-medium text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                >
                  <IconPlus size={14} />
                  {t("research.writing.saveVersion")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCompare(v => !v)
                    if (!compareA) setCompareA("current")
                    if (!compareB && history[0]) setCompareB(history[0].id)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300/80 bg-white/80 px-3 py-2 text-xs font-medium text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                >
                  <IconGitCompare size={14} />
                  {t("research.writing.compare")}
                </button>
              </>
            ) : null}
            <ModuleExportActions
              onExportMd={exportMarkdown}
              onExportJson={exportJson}
              disabled={!writingBundle}
            />
          </>
        }
      />

      {/* Optional notes for the reviser */}
      <div className="mt-5 rounded-3xl border border-stone-200/90 bg-white/90 p-3 dark:border-white/[0.08] dark:bg-[#12151a]/90">
        <textarea
          value={materials}
          onChange={e => setMaterials(e.target.value)}
          rows={2}
          placeholder={t("research.polish.materialsPlaceholder")}
          className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 text-sm outline-none ring-lime-700/25 placeholder:text-stone-400 focus:ring-2 dark:border-white/10 dark:bg-black/20 dark:text-white/90"
        />
      </div>

      {/* Hidden file input always mounted (outside conditional trees) */}
      <input
        ref={fileRef}
        type="file"
        accept={RESEARCH_DOC_ACCEPT}
        className="hidden"
        onChange={e => onPickFiles(e.target.files, { asDraft: true })}
      />

      {/* Single stable prose editor —children only CSS-toggled, never remounted */}
      <div className="mt-4 rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
            {writingBundle
              ? t("research.writing.contentTitle")
              : t("research.polish.pastePlaceholder")}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={
                writingBundle
                  ? "hidden"
                  : "inline-flex h-8 items-center gap-1.5 rounded-lg bg-lime-800 px-2.5 text-[11px] font-medium text-white dark:bg-lime-400 dark:text-stone-950"
              }
            >
              <IconFileUpload size={14} />
              {t("research.polish.uploadDraft")}
            </button>
            <span
              className={
                writingBundle
                  ? "inline text-[10px] uppercase tracking-wide text-stone-400"
                  : "hidden"
              }
            >
              {writingBundle?.mode || "polish"}
              {writingBundle?.section ? ` · ${writingBundle.section}` : ""}
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
        <p
          className={
            writingBundle ? "hidden" : "mb-2 block text-[11px] text-stone-400"
          }
        >
          {t("research.polish.emptyHint")}
        </p>
        <textarea
          ref={proseRef}
          value={localProse}
          onChange={e => onProseChange(e.target.value)}
          onBlur={() => {
            if (writingBundle) flushProseToSession()
          }}
          rows={14}
          placeholder={t("research.polish.pastePlaceholder")}
          className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 font-serif text-[14px] leading-7 outline-none focus:ring-2 focus:ring-lime-700/25 dark:border-white/10 dark:bg-black/20 dark:text-white/90"
        />
        <div
          className={writingBundle ? "hidden" : "mt-2 flex justify-end"}
        >
          <button
            type="button"
            disabled={!localProse.trim()}
            onClick={seedDraftFromPaste}
            className="inline-flex h-9 items-center rounded-xl border border-stone-300 px-3 text-xs font-medium text-stone-700 disabled:opacity-40 dark:border-white/15 dark:text-white/70"
          >
            {t("research.polish.usePaste")}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-3xl border border-stone-200/90 bg-white/90 p-4 dark:border-white/[0.08] dark:bg-[#12151a]/90">
        <div className="flex flex-wrap gap-1.5">
          {POLISH_WRITING_MODES.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                mode === m
                  ? "bg-lime-800 text-white dark:bg-lime-400 dark:text-stone-950"
                  : "border border-stone-200 bg-white text-stone-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55"
              }`}
            >
              {t(`research.writing.modes.${m}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 dark:text-white/55">
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

        <div
          className={
            mode === "revise_feedback"
              ? "block space-y-2 rounded-2xl border border-lime-600/20 bg-lime-500/[0.05] p-3"
              : "hidden"
          }
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-lime-800 dark:text-lime-200">
            {t("research.writing.feedbackTitle")}
          </div>
          <textarea
            value={commentsRaw}
            onChange={e => setCommentsRaw(e.target.value)}
            rows={4}
            placeholder={t("research.writing.feedbackPlaceholder")}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-lime-700/25 dark:border-white/10 dark:bg-black/20 dark:text-white/85"
          />
          <button
            type="button"
            onClick={parseComments}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-[11px] dark:border-white/15"
          >
            {t("research.writing.parseComments")}
          </button>
          {comments.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {comments.map(c => (
                <li
                  key={c.id}
                  className="rounded-lg border border-stone-200/80 bg-white px-2.5 py-1.5 text-[11px] dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <span className="font-mono text-lime-800 dark:text-lime-300">
                    {c.id}
                  </span>{" "}
                  <span className="text-stone-500">
                    [{c.status || "pending"}
                    {c.stance ? ` · ${c.stance}` : ""}]
                  </span>
                  <div className="mt-0.5 text-stone-700 dark:text-white/70">
                    {c.text}
                  </div>
                  {c.action ? (
                    <div className="mt-0.5 text-stone-400">→{c.action}</div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div
          className={
            mode === "revise_scoped"
              ? "block space-y-2 rounded-2xl border border-lime-600/20 bg-lime-500/[0.05] p-3"
              : "hidden"
          }
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-lime-800 dark:text-lime-200">
            {t("research.writing.scopedTitle")}
          </div>
          <p className="text-[11px] text-stone-500">
            {t("research.writing.scopedHint")}
          </p>
          <button
            type="button"
            onClick={captureSelection}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-[11px] dark:border-white/15"
          >
            {t("research.writing.captureSelection")}
          </button>
          <textarea
            value={scopedTarget}
            onChange={e => setScopedTarget(e.target.value)}
            rows={3}
            placeholder={t("research.writing.targetPlaceholder")}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none dark:border-white/10 dark:bg-black/20 dark:text-white/85"
          />
          <textarea
            value={scopedInstruction}
            onChange={e => setScopedInstruction(e.target.value)}
            rows={2}
            placeholder={t("research.writing.instructionPlaceholder")}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs outline-none dark:border-white/10 dark:bg-black/20 dark:text-white/85"
          />
          <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-white/55">
            <input
              type="checkbox"
              checked={preserveClaims}
              onChange={e => setPreserveClaims(e.target.checked)}
            />
            {t("research.writing.preserveClaims")}
          </label>
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
            disabled={writingLoading || !writingBundle}
            onClick={runGenerate}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-lime-800 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-lime-400 dark:text-stone-950"
          >
            {writingLoading ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconSparkles size={16} />
            )}
            {writingLoading
              ? t("research.polish.running")
              : t("research.polish.generate")}
          </button>
        </div>
      </div>

      {writingError ? (
        <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {writingError}
        </div>
      ) : null}

      <div
        className={
          showCompare
            ? "mt-4 block space-y-3 rounded-3xl border border-stone-200/90 bg-white/90 p-4 dark:border-white/[0.08] dark:bg-[#12151a]/90"
            : "hidden"
        }
      >
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="inline-flex items-center gap-1.5">
              A
              <select
                value={compareA}
                onChange={e => setCompareA(e.target.value)}
                className="rounded-lg border border-stone-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-black/20"
              >
                <option value="current">
                  {t("research.writing.versionCurrent")}
                </option>
                {history.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-1.5">
              B
              <select
                value={compareB}
                onChange={e => setCompareB(e.target.value)}
                className="rounded-lg border border-stone-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-black/20"
              >
                <option value="current">
                  {t("research.writing.versionCurrent")}
                </option>
                {history.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-stone-200 p-3 dark:border-white/10">
              <div className="mb-2 text-[10px] font-semibold uppercase text-stone-400">
                A
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-serif text-[12px] leading-6 text-stone-700 dark:text-white/70">
                {bundleA?.content || t("research.writing.compareEmpty")}
              </pre>
            </div>
            <div className="rounded-xl border border-stone-200 p-3 dark:border-white/10">
              <div className="mb-2 text-[10px] font-semibold uppercase text-stone-400">
                B
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-serif text-[12px] leading-6 text-stone-700 dark:text-white/70">
                {bundleB?.content || t("research.writing.compareEmpty")}
              </pre>
            </div>
          </div>
          {history.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {history.map(h => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => restoreVersion(h.id)}
                    className="rounded-full border border-stone-200 px-2.5 py-1 text-[10px] text-stone-600 hover:border-lime-600/40 dark:border-white/10 dark:text-white/55"
                  >
                    {t("research.writing.restore")} · {h.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-stone-400">
              {t("research.writing.historyEmpty")}
            </p>
          )}
      </div>

      <div
        className={
          writingBundle
            ? "mt-5 grid gap-4 lg:grid-cols-[1fr_280px]"
            : "hidden"
        }
      >
          <div className="space-y-4">
                {(writingBundle?.pendingSemanticDiffs || []).length > 0 ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <h2 className="mb-3 text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.writing.diffsTitle")}
                </h2>
                <ul className="space-y-3">
                  {(writingBundle?.pendingSemanticDiffs || []).map((d, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-stone-100 p-3 text-xs dark:border-white/[0.05]"
                    >
                      <p className="mb-2 text-stone-500">
                        {d.commentId ? (
                          <span className="mr-1 font-mono text-lime-800 dark:text-lime-300">
                            {d.commentId}
                          </span>
                        ) : null}
                        {d.reason}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg bg-rose-500/5 p-2 text-rose-900/80 dark:text-rose-200/80">
                          <div className="mb-1 text-[10px] uppercase opacity-60">
                            before
                          </div>
                          {d.before}
                        </div>
                        <div className="rounded-lg bg-emerald-500/5 p-2 text-emerald-900/80 dark:text-emerald-200/80">
                          <div className="mb-1 text-[10px] uppercase opacity-60">
                            after
                          </div>
                          {d.after}
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={d.accepted === true}
                          onClick={() => setDiffAccepted(i, true)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/90 px-2.5 py-1 text-[11px] text-white disabled:opacity-40"
                        >
                          <IconCheck size={12} />
                          {t("research.writing.acceptDiff")}
                        </button>
                        <button
                          type="button"
                          disabled={d.accepted === false}
                          onClick={() => setDiffAccepted(i, false)}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] text-stone-600 disabled:opacity-40 dark:border-white/10"
                        >
                          <IconX size={12} />
                          {t("research.writing.rejectDiff")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
              <h2 className="mb-2 text-sm font-semibold text-stone-800 dark:text-white/85">
                {t("research.writing.gatesTitle")}
              </h2>
              <ul className="space-y-1.5">
                {(writingBundle?.gates || []).map((g, i) => (
                  <li
                    key={`${g.id}-${i}`}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${gateTone(g.severity)}`}
                  >
                    <span className="font-semibold">{g.severity}</span> · {g.message}
                  </li>
                ))}
              </ul>
            </div>

            {history.length > 0 ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <h2 className="mb-2 text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.writing.historyTitle")}
                </h2>
                <ul className="space-y-1">
                  {history.slice(0, 8).map(h => (
                    <li key={h.id}>
                      <button
                        type="button"
                        onClick={() => restoreVersion(h.id)}
                        className="w-full rounded-lg px-2 py-1.5 text-left text-[11px] text-stone-600 hover:bg-stone-50 dark:text-white/55 dark:hover:bg-white/[0.04]"
                      >
                        {h.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
    </ModulePageShell>
  )
}
