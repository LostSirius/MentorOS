"use client"

import { ChatbotUIContext } from "@/context/context"
import { CopilotContext } from "@/context/copilot-context"
import { resolveModelProvider } from "@/lib/copilot-generator"
import { emitPetEvent } from "@/lib/desktop-pet/events"
import {
  CHECKLIST_SEVERITIES,
  buildReviewGates,
  computeReadiness,
  emptyReviewSession,
  filterChecklist,
  pushReviewReport,
  reviewToMarkdown,
  type ChecklistSeverity,
  type ReviewReport,
  type ResponseOutlineItem
} from "@/lib/review-types"
import {
  exportTextArtifact,
  stampFilename
} from "@/lib/research-export"
import { moduleAccent } from "@/lib/research-module-accents"
import {
  RESEARCH_DOC_ACCEPT,
  readResearchFileAsText
} from "@/lib/research-uploads"
import {
  IconClipboardCheck,
  IconFileUpload,
  IconLoader2,
  IconSparkles
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  ModuleExportActions,
  ModulePageHeader
} from "./module-export-actions"
import { ModulePageShell } from "./module-page-shell"
import { ReviewScoreCanvas } from "./review-score-canvas"

function gateTone(sev: string) {
  if (sev === "BLOCK")
    return "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
  if (sev === "WARN")
    return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
  if (sev === "CLEAR")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
  return "border-stone-200 bg-stone-50 text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
}

function severityTone(sev: ChecklistSeverity) {
  if (sev === "CRITICAL")
    return "border-rose-500/35 bg-rose-500/10 text-rose-800 dark:text-rose-200"
  if (sev === "MAJOR")
    return "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200"
  if (sev === "MINOR")
    return "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200"
  return "border-stone-200 bg-stone-50 text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
}

function readinessTone(light: string) {
  if (light === "red") return "bg-rose-600 text-white"
  if (light === "yellow") return "bg-amber-500 text-stone-950"
  return "bg-emerald-600 text-white"
}

/** Pre-submission review + multi-perspective peer review + response outline. */
export const ReviewResearchPage: FC = () => {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith("zh") ? "zh" : "en"
  const accent = moduleAccent("review")

  const {
    ideaCard,
    experimentRecord,
    writingSession,
    figureSession,
    reviewSession,
    setReviewSession,
    reviewLoading,
    setReviewLoading,
    reviewError,
    setReviewError
  } = useContext(CopilotContext)

  const {
    chatSettings,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const report = reviewSession?.current || null

  const [manuscript, setManuscript] = useState(
    () => writingSession?.current?.content || ""
  )
  const [userNotes, setUserNotes] = useState("")
  const [manuscriptDirty, setManuscriptDirty] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<
    ChecklistSeverity | "ALL"
  >("ALL")
  const [tab, setTab] = useState<
    "checklist" | "perspectives" | "response" | "outline"
  >("checklist")
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (manuscriptDirty) return
    const content = writingSession?.current?.content || ""
    setManuscript(content)
  }, [writingSession?.current?.createdAt, writingSession?.current?.content, manuscriptDirty])

  const filteredChecklist = useMemo(
    () => (report ? filterChecklist(report.checklist, severityFilter) : []),
    [report, severityFilter]
  )

  const readiness = report?.readiness || "green"

  const importWriting = () => {
    const content = writingSession?.current?.content?.trim()
    if (!content) {
      toast.error(t("research.review.toastNoWriting"))
      return
    }
    setManuscript(content)
    setManuscriptDirty(false)
    toast.success(t("research.review.toastWritingImported"))
  }

  const seedManuscriptFromFile = (fileName: string, rawText: string) => {
    const body = rawText
      .replace(/^\[File:[^\]]*\]\n?/, "")
      .replace(/^\[User image:[^\]]*\]\n?/, "")
      .trim()
    if (
      !body ||
      body.includes("could not extract") ||
      body.includes("text extraction failed") ||
      body.includes("binary format")
    ) {
      toast.error(t("research.review.toastUploadFail", { name: fileName }))
      return
    }
    setManuscript(body)
    setManuscriptDirty(true)
    toast.success(t("research.review.toastUploaded", { name: fileName }))
  }

  const onPickManuscript = async (list: FileList | null) => {
    const file = list?.[0]
    if (!file) return
    setUploading(true)
    try {
      const text = await readResearchFileAsText(file)
      seedManuscriptFromFile(file.name, text)
    } catch {
      toast.error(t("research.review.toastUploadFail", { name: file.name }))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const runReview = async () => {
    if (!chatSettings) {
      toast.error(t("research.review.toastNeedModel"))
      return
    }
    if (manuscript.trim().length < 80) {
      toast.error(t("research.review.toastNeedManuscript"))
      return
    }

    setReviewLoading(true)
    setReviewError(null)
    try {
      const provider = resolveModelProvider(
        chatSettings.model,
        models,
        availableHostedModels,
        availableLocalModels,
        availableOpenRouterModels
      )
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "full",
          manuscript,
          userNotes: userNotes || undefined,
          ideaCard: ideaCard || undefined,
          experimentRecord: experimentRecord || undefined,
          writingSession: writingSession || undefined,
          figureSession: figureSession || undefined,
          chatSettings,
          provider: provider.provider,
          customModelId: provider.customModelId,
          locale
        })
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(data.message || t("research.review.toastFail"))
      const next = data.report as ReviewReport
      setReviewSession(prev =>
        pushReviewReport(prev || emptyReviewSession(), next)
      )
      setTab("checklist")
      toast.success(t("research.review.toastDone"))
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : t("research.review.toastFail")
      setReviewError(msg)
      toast.error(msg)
    } finally {
      setReviewLoading(false)
    }
  }

  const patchResponse = (index: number, patch: Partial<ResponseOutlineItem>) => {
    if (!report?.responseOutline) return
    const outline = report.responseOutline.map((r, i) =>
      i === index ? { ...r, ...patch } : r
    )
    const next = {
      ...report,
      responseOutline: outline,
      readiness: computeReadiness(report.checklist),
      gates: buildReviewGates({ ...report, responseOutline: outline })
    }
    setReviewSession(prev => ({
      version: 1,
      current: next,
      history: prev?.history || []
    }))
    const wasAllConfirmed =
      report.responseOutline.length > 0 &&
      report.responseOutline.every(r => r.confirmed)
    const nowAllConfirmed =
      outline.length > 0 && outline.every(r => r.confirmed)
    if (!wasAllConfirmed && nowAllConfirmed) {
      emitPetEvent({ type: "research-progress", growth: "review_done" })
    }
  }

  const exportMd = async () => {
    if (!report) return
    const ok = await exportTextArtifact({
      filename: stampFilename("review", "md"),
      content: reviewToMarkdown(report),
      mime: "text/markdown;charset=utf-8"
    })
    toast.success(
      ok
        ? t("research.review.toastExport")
        : t("research.review.toastExportDownload")
    )
  }

  const exportJson = async () => {
    if (!reviewSession?.current) return
    const ok = await exportTextArtifact({
      filename: stampFilename("review", "json"),
      content: JSON.stringify(reviewSession, null, 2),
      mime: "application/json"
    })
    toast.success(
      ok
        ? t("research.review.toastExportJson")
        : t("research.review.toastExportDownload")
    )
  }

  return (
    <ModulePageShell>
      <ModulePageHeader
        moduleId="review"
        badge={
          <div
            className={`mb-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badge}`}
          >
            <IconClipboardCheck size={12} />
            {t("research.review.badge")}
          </div>
        }
        title={t("research.review.title")}
        subtitle={t("research.review.subtitle")}
        actions={
          <>
            {report ? (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${readinessTone(readiness)}`}
              >
                {t(`research.review.readiness.${readiness}`)}
              </span>
            ) : null}
            <ModuleExportActions
              onExportMd={exportMd}
              onExportJson={exportJson}
              disabled={!report}
            />
          </>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept={RESEARCH_DOC_ACCEPT}
        className="hidden"
        onChange={e => onPickManuscript(e.target.files)}
      />

      <div className="mt-5 space-y-3 rounded-3xl border border-stone-200/90 bg-white/90 p-4 dark:border-white/[0.08] dark:bg-[#12151a]/90">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            {t("research.review.manuscriptLabel")}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={uploading || reviewLoading}
              onClick={() => fileRef.current?.click()}
              className={`inline-flex items-center gap-1 text-[11px] font-medium disabled:opacity-50 ${accent.link}`}
            >
              {uploading ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : (
                <IconFileUpload size={14} />
              )}
              {uploading
                ? t("research.review.uploading")
                : t("research.review.uploadManuscript")}
            </button>
            <button
              type="button"
              onClick={importWriting}
              className={`text-[11px] font-medium ${accent.link}`}
            >
              {t("research.review.importWriting")}
            </button>
          </div>
        </div>
        <textarea
          value={manuscript}
          onChange={e => {
            setManuscriptDirty(true)
            setManuscript(e.target.value)
          }}
          rows={10}
          placeholder={t("research.review.manuscriptPlaceholder")}
          className={`w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 font-serif text-[14px] leading-7 outline-none focus:ring-2 ${accent.focus} dark:border-white/10 dark:bg-black/20 dark:text-white/90`}
        />
        <textarea
          value={userNotes}
          onChange={e => setUserNotes(e.target.value)}
          rows={2}
          placeholder={t("research.review.notesPlaceholder")}
          className={`w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:ring-2 ${accent.focus} dark:border-white/10 dark:bg-black/20 dark:text-white/90`}
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled={reviewLoading}
            onClick={runReview}
            className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium disabled:opacity-50 ${accent.primary}`}
          >
            {reviewLoading ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconSparkles size={16} />
            )}
            {reviewLoading
              ? t("research.review.running")
              : t("research.review.generate")}
          </button>
        </div>
      </div>

      {reviewError ? (
        <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {reviewError}
        </div>
      ) : null}

      {!report && !reviewLoading ? (
        <div className="mx-auto mt-10 max-w-lg py-10 text-center text-sm text-stone-500 dark:text-white/40">
          {t("research.review.emptyHint")}
        </div>
      ) : null}

      {report ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <ReviewScoreCanvas report={report} />

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["checklist", t("research.review.tabs.checklist")],
                  ["outline", t("research.review.tabs.outline")],
                  ["perspectives", t("research.review.tabs.perspectives")],
                  ["response", t("research.review.tabs.response")]
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    tab === id
                      ? accent.chip
                      : "border border-stone-200 bg-white text-stone-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "outline" ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <h2 className="mb-1 text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.review.outlineTitle")}
                </h2>
                <p className="mb-3 text-[11px] text-stone-400">
                  {t("research.review.outlineHint")}
                </p>
                {report.feedbackOutline ? (
                  <div className="space-y-4 text-[12px] text-stone-700 dark:text-white/70">
                    <section>
                      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                        {t("research.review.outline.significance")}
                      </h3>
                      <ul className="list-disc space-y-1 pl-4">
                        {(report.feedbackOutline.significanceNovelty || []).map(
                          (s, i) => (
                            <li key={i}>{s}</li>
                          )
                        )}
                      </ul>
                    </section>
                    <section>
                      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                        {t("research.review.outline.accept")}
                      </h3>
                      <ul className="list-disc space-y-1 pl-4">
                        {(report.feedbackOutline.acceptReasons || []).map(
                          (s, i) => (
                            <li key={i}>{s}</li>
                          )
                        )}
                      </ul>
                    </section>
                    <section>
                      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                        {t("research.review.outline.reject")}
                      </h3>
                      <ol className="list-decimal space-y-2 pl-4">
                        {(report.feedbackOutline.rejectReasons || []).map(
                          (r, i) => (
                            <li key={i}>
                              <span className="font-semibold">{r.title}</span>
                              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                                {(r.details || []).map((d, j) => (
                                  <li key={j}>{d}</li>
                                ))}
                              </ul>
                            </li>
                          )
                        )}
                      </ol>
                    </section>
                    <section>
                      <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                        {t("research.review.outline.suggestions")}
                      </h3>
                      <ul className="list-disc space-y-1 pl-4">
                        {(report.feedbackOutline.suggestions || []).map(
                          (s, i) => (
                            <li key={i}>{s}</li>
                          )
                        )}
                      </ul>
                    </section>
                  </div>
                ) : (
                  <p className="text-[12px] text-stone-400">
                    {t("research.review.outlineEmpty")}
                  </p>
                )}
              </div>
            ) : null}

            {tab === "checklist" ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSeverityFilter("ALL")}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      severityFilter === "ALL"
                        ? "bg-stone-900 text-white dark:bg-white dark:text-stone-950"
                        : "border border-stone-200 text-stone-500 dark:border-white/10"
                    }`}
                  >
                    {t("research.review.filterAll")}
                  </button>
                  {CHECKLIST_SEVERITIES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverityFilter(s)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                        severityFilter === s
                          ? "bg-stone-900 text-white dark:bg-white dark:text-stone-950"
                          : "border border-stone-200 text-stone-500 dark:border-white/10"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <ul className="space-y-2">
                  {filteredChecklist.map(c => (
                    <li
                      key={c.id}
                      className={`rounded-xl border px-3 py-2 text-[12px] ${severityTone(c.severity)}`}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] opacity-70">
                          {c.id}
                        </span>
                        <span className="font-semibold">{c.severity}</span>
                        {c.dimension ? (
                          <span className="text-[10px] opacity-60">
                            {c.dimension}
                          </span>
                        ) : null}
                      </div>
                      <p>{c.detail}</p>
                      {c.suggestion ? (
                        <p className="mt-1 opacity-80">→ {c.suggestion}</p>
                      ) : null}
                    </li>
                  ))}
                  {filteredChecklist.length === 0 ? (
                    <p className="text-[12px] text-stone-400">
                      {t("research.review.checklistEmpty")}
                    </p>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {tab === "perspectives" ? (
              <div className="space-y-3">
                {report.perspectives.map((p, i) => (
                  <div
                    key={`${p.name}-${i}`}
                    className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]"
                  >
                    <h3 className="mb-2 text-sm font-semibold text-stone-800 dark:text-white/85">
                      {p.name}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-3 text-[12px]">
                      <div>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                          {t("research.review.strengths")}
                        </div>
                        <ul className="space-y-1 text-stone-600 dark:text-white/65">
                          {p.strengths.map((s, j) => (
                            <li key={j}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                          {t("research.review.weaknesses")}
                        </div>
                        <ul className="space-y-1 text-stone-600 dark:text-white/65">
                          {p.weaknesses.map((s, j) => (
                            <li key={j}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                          {t("research.review.questions")}
                        </div>
                        <ul className="space-y-1 text-stone-600 dark:text-white/65">
                          {p.questions.map((s, j) => (
                            <li key={j}>• {s}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
                {report.perspectives.length === 0 ? (
                  <p className="text-[12px] text-stone-400">
                    {t("research.review.perspectivesEmpty")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {tab === "response" ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <p className="mb-3 text-[11px] text-stone-400">
                  {t("research.review.responseHint")}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-stone-200 text-[10px] uppercase tracking-wide text-stone-400 dark:border-white/10">
                        <th className="px-2 py-2">{t("research.review.colConfirm")}</th>
                        <th className="px-2 py-2">{t("research.review.colId")}</th>
                        <th className="px-2 py-2">{t("research.review.colStance")}</th>
                        <th className="px-2 py-2">{t("research.review.colAction")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report.responseOutline || []).map((r, i) => (
                        <tr
                          key={`${r.reviewPointId}-${i}`}
                          className="border-b border-stone-100 dark:border-white/[0.05]"
                        >
                          <td className="px-2 py-2">
                            <input
                              type="checkbox"
                              checked={Boolean(r.confirmed)}
                              onChange={e =>
                                patchResponse(i, {
                                  confirmed: e.target.checked
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-2 font-mono text-[11px]">
                            {r.reviewPointId}
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={r.stance}
                              onChange={e =>
                                patchResponse(i, {
                                  stance: e.target.value as ResponseOutlineItem["stance"]
                                })
                              }
                              className="rounded-lg border border-stone-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-black/20"
                            >
                              <option value="agree">
                                {t("research.review.stances.agree")}
                              </option>
                              <option value="partial">
                                {t("research.review.stances.partial")}
                              </option>
                              <option value="disagree">
                                {t("research.review.stances.disagree")}
                              </option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={r.action}
                              onChange={e =>
                                patchResponse(i, { action: e.target.value })
                              }
                              className="w-full rounded-lg border border-stone-200 bg-[#fafaf8] px-2 py-1 dark:border-white/10 dark:bg-black/20"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(report.responseOutline || []).length === 0 ? (
                    <p className="mt-2 text-[12px] text-stone-400">
                      {t("research.review.responseEmpty")}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
              <h2 className="mb-2 text-sm font-semibold text-stone-800 dark:text-white/85">
                {t("research.review.gatesTitle")}
              </h2>
              <ul className="space-y-1.5">
                {report.gates.map((g, i) => (
                  <li
                    key={`${g.id}-${i}`}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${gateTone(g.severity)}`}
                  >
                    <span className="font-semibold">{g.severity}</span> ·{" "}
                    {g.message}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[11px] leading-relaxed text-stone-400">
              {t("research.review.noAutoRewrite")}
            </p>
          </aside>
        </div>
      ) : null}
    </ModulePageShell>
  )
}
