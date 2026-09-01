"use client"

import { CopilotContext } from "@/context/copilot-context"
import { moduleAccent } from "@/lib/research-module-accents"
import {
  OVERVIEW_PIPELINE,
  buildOverviewState,
  isOverviewState,
  overviewToMarkdown,
  type GateSeverity,
  type ModulePipelineStatus,
  type OverviewState
} from "@/lib/overview-types"
import {
  exportTextArtifact,
  stampFilename
} from "@/lib/research-export"
import type { ResearchModuleId } from "@/lib/research-modules"
import {
  IconMap2,
  IconUpload
} from "@tabler/icons-react"
import { FC, useCallback, useContext, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  HEADER_ACTION_BTN,
  ModuleExportActions,
  ModulePageHeader
} from "./module-export-actions"
import { ModulePageShell } from "./module-page-shell"

function readinessTone(light: string) {
  if (light === "red") return "bg-rose-600 text-white"
  if (light === "yellow") return "bg-amber-500 text-stone-950"
  return "bg-emerald-600 text-white"
}

function gateTone(sev: GateSeverity | string) {
  if (sev === "BLOCK")
    return "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
  if (sev === "WARN")
    return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
  if (sev === "CLEAR")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
  return "border-stone-200 bg-stone-50 text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
}

function statusTone(st: ModulePipelineStatus) {
  if (st === "ready")
    return "border-emerald-600/35 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
  if (st === "blocked")
    return "border-rose-600/35 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
  if (st === "partial")
    return "border-amber-600/35 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
  return "border-stone-200 bg-stone-50 text-stone-600 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/55"
}

interface OverviewResearchPageProps {
  onNavigate: (id: ResearchModuleId) => void
  notes: string
  onNotesChange: (notes: string) => void
}

/** Aggregate Material Passport — no LLM; live modules only. */
export const OverviewResearchPage: FC<OverviewResearchPageProps> = ({
  onNavigate,
  notes,
  onNotesChange
}) => {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith("zh") ? "zh" : "en"
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    literatureReview,
    ideaCandidates,
    ideaCard,
    experimentRecord,
    writingSession,
    figureSession,
    reviewSession
  } = useContext(CopilotContext)

  const state: OverviewState = useMemo(
    () =>
      buildOverviewState({
        literatureReview,
        ideaCard,
        ideaCandidatesCount: ideaCandidates?.length || 0,
        experimentRecord,
        writingSession,
        figureSession,
        reviewSession,
        locale,
        notes
      }),
    [
      literatureReview,
      ideaCard,
      ideaCandidates,
      experimentRecord,
      writingSession,
      figureSession,
      reviewSession,
      locale,
      notes
    ]
  )

  const exportMd = useCallback(async () => {
    const ok = await exportTextArtifact({
      filename: stampFilename("overview", "md"),
      content: overviewToMarkdown(state),
      mime: "text/markdown;charset=utf-8"
    })
    toast.success(
      ok
        ? t("research.overview.toastExport")
        : t("research.overview.toastExportDownload")
    )
  }, [state, t])

  const exportJson = useCallback(async () => {
    const ok = await exportTextArtifact({
      filename: stampFilename("overview", "json"),
      content: JSON.stringify(state, null, 2),
      mime: "application/json"
    })
    toast.success(
      ok
        ? t("research.overview.toastExportJson")
        : t("research.overview.toastExportDownload")
    )
  }, [state, t])

  const onUpload = async (file: File | null) => {
    if (!file) return
    const name = file.name.toLowerCase()
    try {
      const text = await file.text()
      if (name.endsWith(".json")) {
        const parsed = JSON.parse(text) as unknown
        if (isOverviewState(parsed)) {
          const snap = [
            t("research.overview.importPassportHeader"),
            ...parsed.passport.map(
              p => `- [${p.gateSummary}] ${p.kind}: ${p.title}`
            ),
            parsed.notes?.trim() ? `\n${parsed.notes.trim()}` : ""
          ]
            .filter(Boolean)
            .join("\n")
          onNotesChange(
            notes.trim() ? `${notes.trim()}\n\n${snap}` : snap
          )
          toast.success(t("research.overview.toastImportOverview"))
          return
        }
        onNotesChange(
          notes.trim()
            ? `${notes.trim()}\n\n\`\`\`json\n${text.slice(0, 12000)}\n\`\`\``
            : text.slice(0, 12000)
        )
        toast.success(t("research.overview.toastImportJson"))
        return
      }
      // md / txt / pdf-as-text / other
      const clipped = text.slice(0, 24000)
      onNotesChange(
        notes.trim()
          ? `${notes.trim()}\n\n---\n# ${file.name}\n${clipped}`
          : `# ${file.name}\n${clipped}`
      )
      toast.success(t("research.overview.toastImportFile"))
    } catch {
      toast.error(t("research.overview.toastImportFail"))
    }
  }

  const empty = state.passport.length === 0
  const accent = moduleAccent("overview")

  return (
    <ModulePageShell>
      <ModulePageHeader
        moduleId="overview"
        badge={
          <div
            className={`mb-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badge}`}
          >
            <IconMap2 size={12} />
            {t("research.overview.badge")}
          </div>
        }
        title={t("research.overview.title")}
        subtitle={t("research.overview.subtitle")}
        actions={
          <>
            <span
              className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold ${readinessTone(state.readiness)}`}
            >
              {t(`research.overview.readiness.${state.readiness}`)}
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={HEADER_ACTION_BTN}
            >
              <IconUpload size={14} stroke={1.75} />
              {t("research.overview.upload")}
            </button>
            <ModuleExportActions
              onExportMd={exportMd}
              onExportJson={exportJson}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".json,.md,.txt,.pdf,.markdown,text/plain,application/json"
              className="hidden"
              onChange={e => {
                void onUpload(e.target.files?.[0] || null)
                e.target.value = ""
              }}
            />
          </>
        }
      />

      {/* Pipeline */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
          {t("research.overview.pipelineTitle")}
        </h2>
        <p className="mt-0.5 text-xs text-stone-500 dark:text-white/50">
          {t("research.overview.pipelineHint")}
        </p>
        <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {OVERVIEW_PIPELINE.map((id, i) => {
            const st =
              (state.modules[id as keyof typeof state.modules]
                ?.status as ModulePipelineStatus) || "empty"
            const clickable = id !== "overview"
            return (
              <li key={id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => clickable && onNavigate(id)}
                  disabled={!clickable}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${statusTone(st)} ${clickable ? "cursor-pointer hover:brightness-110" : "cursor-default opacity-90"}`}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-black/10 text-[11px] font-semibold tabular-nums dark:bg-white/10">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold leading-tight">
                      {t(`research.modules.${id}.short`)}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium capitalize leading-tight opacity-80">
                      {t(`research.overview.status.${st}`)}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </section>

      {/* Scores */}
      {state.scores.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
            {t("research.overview.scoresTitle")}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.scores.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onNavigate(s.moduleId)}
                className="rounded-lg border border-teal-700/15 bg-teal-50/80 px-3 py-2 text-left transition hover:border-teal-700/30 hover:bg-teal-50 dark:border-teal-400/20 dark:bg-teal-400/10 dark:hover:border-teal-400/35 dark:hover:bg-teal-400/15"
              >
                <div className="text-[10px] font-medium uppercase tracking-wide text-teal-800/70 dark:text-teal-200/75">
                  {s.label}
                </div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums text-stone-900 dark:text-white">
                  {s.value}
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Passport */}
        <section>
          <div className="flex items-center gap-2">
            <IconMap2 size={16} className="text-teal-700 dark:text-teal-300" />
            <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
              {t("research.overview.passportTitle")}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-white/40">
            {t("research.overview.passportHint")}
          </p>
          {empty ? (
            <div className="mt-3 rounded-xl border border-dashed border-stone-300 bg-white/60 px-4 py-8 text-center dark:border-white/15 dark:bg-white/[0.03]">
              <p className="text-sm text-stone-600 dark:text-white/55">
                {t("research.overview.emptyPassport")}
              </p>
              <button
                type="button"
                onClick={() => onNavigate("literature")}
                className="mt-3 inline-flex rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
              >
                {t("research.overview.ctaStartLit")}
              </button>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {state.passport.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(p.moduleId)}
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left hover:border-teal-600/30 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-teal-400/25"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-medium uppercase tracking-wide text-stone-400 dark:text-white/35">
                        {p.kind}
                      </div>
                      <div className="truncate text-sm font-medium text-stone-800 dark:text-white/85">
                        {p.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-stone-400 dark:text-white/35">
                        {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${gateTone(p.gateSummary)}`}
                    >
                      {p.gateSummary}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Gaps + next */}
        <section>
          <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
            {t("research.overview.gapsTitle")}
          </h2>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-white/40">
            {t("research.overview.gapsHint")}
          </p>
          {state.gaps.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300/90">
              {t("research.overview.gapsClear")}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {state.gaps.map(g => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => g.cta && onNavigate(g.cta)}
                    className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${gateTone(g.severity)}`}
                  >
                    <span className="shrink-0 text-[10px] font-bold uppercase">
                      {g.severity}
                    </span>
                    <span className="min-w-0 flex-1 leading-snug">
                      {g.message}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-6 text-sm font-semibold text-stone-800 dark:text-white/85">
            {t("research.overview.nextTitle")}
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {state.nextActions.map((a, idx) => (
              <button
                key={`${a.moduleId}-${idx}`}
                type="button"
                onClick={() => onNavigate(a.moduleId)}
                className="rounded-xl border border-teal-700/25 bg-teal-600/10 px-3 py-2.5 text-left text-sm text-teal-900 hover:bg-teal-600/15 dark:border-teal-400/20 dark:text-teal-100 dark:hover:bg-teal-400/10"
              >
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                  {t(`research.modules.${a.moduleId}.short`)}
                </span>
                <div className="mt-0.5 leading-snug">{a.label}</div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Notes */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
          {t("research.overview.notesTitle")}
        </h2>
        <textarea
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
          rows={5}
          placeholder={t("research.overview.notesPlaceholder")}
          className="mt-2 w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none ring-teal-600/30 placeholder:text-stone-400 focus:ring-2 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/85 dark:placeholder:text-white/30"
        />
        <p className="mt-1.5 text-[11px] text-stone-400 dark:text-white/35">
          {t("research.overview.aggregateNote")}
        </p>
      </section>
    </ModulePageShell>
  )
}
