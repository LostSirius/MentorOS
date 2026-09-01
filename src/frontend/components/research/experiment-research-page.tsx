"use client"

import { ChatbotUIContext } from "@/context/context"
import { CopilotContext } from "@/context/copilot-context"
import { resolveModelProvider } from "@/lib/copilot-generator"
import { emitPetEvent } from "@/lib/desktop-pet/events"
import {
  buildExperimentGates,
  canLockRecipe,
  experimentToMarkdown,
  hasAttachedResults,
  type Baseline,
  type ExperimentRecord
} from "@/lib/experiment-types"
import {
  exportTextArtifact,
  stampFilename
} from "@/lib/research-export"
import { moduleAccent } from "@/lib/research-module-accents"
import { RESEARCH_EXPERIMENT_ACCEPT } from "@/lib/research-uploads"
import {
  IconFileUpload,
  IconFlask,
  IconLoader2,
  IconLock,
  IconLockOpen,
  IconScale,
  IconSparkles,
  IconTrash,
  IconX
} from "@tabler/icons-react"
import { FC, useCallback, useContext, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  ModuleExportActions,
  ModulePageHeader
} from "./module-export-actions"
import { ModulePageShell } from "./module-page-shell"

function ListEditor({
  label,
  values,
  onChange,
  placeholder,
  disabled
}: {
  label: string
  values: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  disabled?: boolean
}) {
  // Stable row ids so typing / locale label changes don't remount inputs
  const rowIdsRef = useRef<string[]>([])
  while (rowIdsRef.current.length < values.length) {
    rowIdsRef.current.push(
      `row_${rowIdsRef.current.length}_${Math.random().toString(36).slice(2, 8)}`
    )
  }
  if (rowIdsRef.current.length > values.length) {
    rowIdsRef.current = rowIdsRef.current.slice(0, values.length)
  }

  return (
    <div className={disabled ? "opacity-70" : undefined}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
          {label}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            rowIdsRef.current.push(
              `row_${rowIdsRef.current.length}_${Math.random().toString(36).slice(2, 8)}`
            )
            onChange([...values, ""])
          }}
          className="text-[10px] text-violet-700 disabled:opacity-40 dark:text-violet-300"
        >
          +
        </button>
      </div>
      <div className="space-y-1.5">
        {values.map((v, i) => (
          <div key={rowIdsRef.current[i]} className="flex gap-1.5">
            <input
              value={v}
              disabled={disabled}
              placeholder={placeholder}
              onChange={e => {
                const next = [...values]
                next[i] = e.target.value
                onChange(next)
              }}
              className="w-full rounded-xl border border-stone-200 bg-[#fafaf8] px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-violet-700/30 disabled:cursor-not-allowed dark:border-white/10 dark:bg-black/20 dark:text-white/85"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                rowIdsRef.current = rowIdsRef.current.filter((_, j) => j !== i)
                onChange(values.filter((_, j) => j !== i))
              }}
              className="rounded-lg p-2 text-stone-400 hover:text-rose-500 disabled:opacity-40"
            >
              <IconTrash size={14} />
            </button>
          </div>
        ))}
        {values.length === 0 ? (
          <p className="text-[11px] text-stone-400">{placeholder}</p>
        ) : null}
      </div>
    </div>
  )
}

export const ExperimentResearchPage: FC = () => {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith("zh") ? "zh" : "en"
  const accent = moduleAccent("experiment")

  const {
    ideaCard,
    literatureReview,
    experimentRecord,
    setExperimentRecord,
    experimentLoading,
    setExperimentLoading,
    experimentError,
    setExperimentError
  } = useContext(CopilotContext)

  const {
    chatSettings,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const [ideaText, setIdeaText] = useState("")
  const [seedFiles, setSeedFiles] = useState<{ name: string; text: string }[]>(
    []
  )
  const [runLog, setRunLog] = useState("")
  const [resultTable, setResultTable] = useState("")
  const [resultFiles, setResultFiles] = useState<
    { name: string; text: string; kind: "log" | "table" }[]
  >([])
  const seedFileRef = useRef<HTMLInputElement>(null)
  const resultFileRef = useRef<HTMLInputElement>(null)

  const record = experimentRecord
  const locked =
    record?.status === "recipe_locked" ||
    record?.status === "results_attached" ||
    record?.status === "interpreted"

  const seedDocumentContext = useMemo(
    () =>
      seedFiles
        .map(f => `--- File: ${f.name} ---\n${f.text}`)
        .join("\n\n")
        .slice(0, 24000),
    [seedFiles]
  )

  const composedIdeaText = useMemo(
    () =>
      [ideaText.trim(), seedDocumentContext].filter(Boolean).join("\n\n").trim(),
    [ideaText, seedDocumentContext]
  )

  const litHints = useMemo(
    () => ({
      topic: literatureReview?.topic,
      gaps: literatureReview?.review?.gaps || [],
      datasets: (literatureReview?.papers || [])
        .flatMap(p => p.datasets || [])
        .filter(Boolean)
        .slice(0, 8)
    }),
    [literatureReview]
  )

  const resolveProvider = () =>
    resolveModelProvider(
      chatSettings!.model,
      models,
      availableHostedModels,
      availableLocalModels,
      availableOpenRouterModels
    )

  const extractFileText = useCallback(
    async (file: File): Promise<string> => {
      const name = file.name.toLowerCase()
      if (
        name.endsWith(".txt") ||
        name.endsWith(".md") ||
        name.endsWith(".markdown") ||
        name.endsWith(".csv") ||
        name.endsWith(".tsv") ||
        name.endsWith(".json") ||
        name.endsWith(".log") ||
        name.endsWith(".yaml") ||
        name.endsWith(".yml") ||
        name.endsWith(".out") ||
        name.endsWith(".tex") ||
        name.endsWith(".xml") ||
        name.endsWith(".html") ||
        name.endsWith(".htm") ||
        name.endsWith(".ipynb")
      ) {
        return file.text()
      }
      if (file.type.startsWith("image/")) {
        return t("research.experiment.imageNote", { name: file.name })
      }
      if (name.endsWith(".pdf") || name.endsWith(".docx")) {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/extract-text", {
          method: "POST",
          body: form
        })
        if (!res.ok)
          return t("research.experiment.fileFail", { name: file.name })
        const data = await res.json()
        return data.text || t("research.experiment.fileOk", { name: file.name })
      }
      return t("research.experiment.attachment", { name: file.name })
    },
    [t]
  )

  const classifyResultKind = (filename: string): "log" | "table" => {
    const name = filename.toLowerCase()
    if (
      name.endsWith(".csv") ||
      name.endsWith(".tsv") ||
      name.endsWith(".json") ||
      name.includes("result") ||
      name.includes("metric") ||
      name.includes("table")
    ) {
      return "table"
    }
    return "log"
  }

  const onPickSeedFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return
      const next: { name: string; text: string }[] = []
      for (const file of Array.from(list)) {
        const text = await extractFileText(file)
        next.push({ name: file.name, text: text.slice(0, 16000) })
      }
      setSeedFiles(prev => [...prev, ...next])
      toast.success(t("research.experiment.toastFiles", { count: next.length }))
      if (seedFileRef.current) seedFileRef.current.value = ""
    },
    [extractFileText, t]
  )

  const onPickResultFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return
      if (!locked) {
        toast.error(t("research.experiment.toastNeedLock"))
        return
      }
      const next: { name: string; text: string; kind: "log" | "table" }[] = []
      for (const file of Array.from(list)) {
        const text = await extractFileText(file)
        const kind = classifyResultKind(file.name)
        const clipped = text.slice(0, 20000)
        next.push({ name: file.name, text: clipped, kind })
        if (kind === "log") {
          setRunLog(prev =>
            prev.trim()
              ? `${prev.trim()}\n\n--- ${file.name} ---\n${clipped}`
              : `--- ${file.name} ---\n${clipped}`
          )
        } else {
          setResultTable(prev =>
            prev.trim()
              ? `${prev.trim()}\n\n--- ${file.name} ---\n${clipped}`
              : `--- ${file.name} ---\n${clipped}`
          )
        }
      }
      setResultFiles(prev => [...prev, ...next])
      toast.success(
        t("research.experiment.toastResultFiles", { count: next.length })
      )
      if (resultFileRef.current) resultFileRef.current.value = ""
    },
    [extractFileText, locked, t]
  )

  const patchRecord = (patch: Partial<ExperimentRecord>) => {
    setExperimentRecord(prev => {
      if (!prev) return prev
      const next = {
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString()
      }
      next.gates = buildExperimentGates(next)
      return next
    })
  }

  const importFromIdea = () => {
    if (!ideaCard) {
      toast.error(t("research.experiment.toastNoIdea"))
      return
    }
    const block = [
      ideaCard.title,
      ideaCard.oneLiner,
      "",
      ...(ideaCard.researchQuestions || []).map(q => `RQ: ${q.text}`),
      ...(ideaCard.hypotheses || []).map(h => `H: ${h}`),
      ideaCard.capabilityFit ? `Capability: ${ideaCard.capabilityFit}` : ""
    ]
      .filter(Boolean)
      .join("\n")
    setIdeaText(prev => (prev.trim() ? `${prev.trim()}\n\n${block}` : block))
    toast.success(t("research.experiment.toastIdeaImported"))
  }

  const callApi = async (
    phase: "draft" | "interpret",
    payloadRecord?: ExperimentRecord
  ) => {
    if (!chatSettings) {
      toast.error(t("research.experiment.toastNeedModel"))
      return null
    }
    const { provider, customModelId } = resolveProvider()
    const res = await fetch("/api/experiment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase,
        ideaCard: ideaCard || undefined,
        ideaText: composedIdeaText || undefined,
        literatureHints: litHints,
        record: payloadRecord,
        chatSettings,
        provider,
        customModelId,
        locale
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || t("research.experiment.toastFail"))
    return data
  }

  const draftRecipe = async () => {
    if (!ideaCard && !composedIdeaText) {
      toast.error(t("research.experiment.toastNeedSeed"))
      return
    }
    setExperimentLoading(true)
    setExperimentError(null)
    try {
      const data = await callApi("draft")
      if (!data?.record) throw new Error(t("research.experiment.toastFail"))
      setExperimentRecord(data.record as ExperimentRecord)
      setRunLog("")
      setResultTable("")
      if (data.warning) toast.message(data.warning)
      toast.success(t("research.experiment.toastDraftDone"))
    } catch (e: any) {
      const msg = e?.message || t("research.experiment.toastFail")
      setExperimentError(msg)
      toast.error(msg)
    } finally {
      setExperimentLoading(false)
    }
  }

  const lockRecipe = () => {
    if (!record || !canLockRecipe(record)) {
      toast.error(t("research.experiment.toastCannotLock"))
      return
    }
    patchRecord({ status: "recipe_locked" })
    toast.success(t("research.experiment.toastLocked"))
    emitPetEvent({ type: "research-progress", growth: "experiment_done" })
  }

  const unlockRecipe = () => {
    if (!record) return
    if (record.status === "interpreted" || hasAttachedResults(record)) {
      toast.message(t("research.experiment.toastUnlockWarn"))
    }
    patchRecord({
      status: "draft",
      interpretation: undefined
    })
  }

  const attachResults = () => {
    if (!record || !locked) {
      toast.error(t("research.experiment.toastNeedLock"))
      return
    }
    const logs = runLog.trim() ? [runLog.trim()] : []
    const tables = resultTable.trim() ? [resultTable.trim()] : []
    if (!logs.length && !tables.length) {
      toast.error(t("research.experiment.toastNeedResults"))
      return
    }
    patchRecord({
      status: "results_attached",
      runLogs: logs,
      resultTables: tables,
      interpretation: undefined
    })
    toast.success(t("research.experiment.toastResultsAttached"))
  }

  const interpretResults = async () => {
    if (!record) return
    const withResults: ExperimentRecord = {
      ...record,
      runLogs: runLog.trim()
        ? [runLog.trim()]
        : record.runLogs || [],
      resultTables: resultTable.trim()
        ? [resultTable.trim()]
        : record.resultTables || []
    }
    if (!hasAttachedResults(withResults)) {
      toast.error(t("research.experiment.toastNeedResults"))
      return
    }
    if (
      withResults.status !== "recipe_locked" &&
      withResults.status !== "results_attached" &&
      withResults.status !== "interpreted"
    ) {
      toast.error(t("research.experiment.toastNeedLock"))
      return
    }
    setExperimentLoading(true)
    setExperimentError(null)
    try {
      const data = await callApi("interpret", withResults)
      if (!data?.record) throw new Error(t("research.experiment.toastFail"))
      setExperimentRecord(data.record as ExperimentRecord)
      if (data.warning) toast.message(data.warning)
      toast.success(t("research.experiment.toastInterpreted"))
    } catch (e: any) {
      const msg = e?.message || t("research.experiment.toastFail")
      setExperimentError(msg)
      toast.error(msg)
    } finally {
      setExperimentLoading(false)
    }
  }

  const exportMarkdown = async () => {
    if (!record) return
    const ok = await exportTextArtifact({
      filename: stampFilename("experiment", "md"),
      content: experimentToMarkdown(record),
      mime: "text/markdown;charset=utf-8"
    })
    toast.success(
      ok
        ? t("research.experiment.toastExport")
        : t("research.experiment.toastExportDownload")
    )
  }

  const exportJson = async () => {
    if (!record) return
    const ok = await exportTextArtifact({
      filename: stampFilename("experiment", "json"),
      content: JSON.stringify(record, null, 2),
      mime: "application/json"
    })
    toast.success(
      ok
        ? t("research.experiment.toastExportJson")
        : t("research.experiment.toastExportDownload")
    )
  }

  const updateBaselines = (baselines: Baseline[]) =>
    patchRecord({ baselines })

  const statusLabel = (s: ExperimentRecord["status"]) =>
    t(`research.experiment.status.${s}`)

  const gateTone = (sev: string) => {
    if (sev === "BLOCK") return "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
    if (sev === "WARN") return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
    if (sev === "CLEAR") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
    return "border-stone-200 bg-stone-50 text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
  }

  return (
    <ModulePageShell>
      <ModulePageHeader
        moduleId="experiment"
        badge={
          <div
            className={`mb-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badge}`}
          >
              <IconFlask size={12} />
              {t("research.experiment.badge")}
            </div>
        }
        title={t("research.experiment.title")}
        subtitle={t("research.experiment.subtitle")}
        actions={
          <ModuleExportActions
            onExportMd={exportMarkdown}
            onExportJson={exportJson}
            disabled={!record}
          />
        }
      />

        {/* Seed */}
        <div className="mt-5 rounded-3xl border border-stone-200/90 bg-white/90 p-3 dark:border-white/[0.08] dark:bg-[#12151a]/90">
          <textarea
            value={ideaText}
            onChange={e => setIdeaText(e.target.value)}
            rows={4}
            placeholder={t("research.experiment.seedPlaceholder")}
            className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 text-sm outline-none ring-violet-700/30 placeholder:text-stone-400 focus:ring-2 dark:border-white/10 dark:bg-black/20 dark:text-white/90"
          />

          {seedFiles.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {seedFiles.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
                >
                  {f.name}
                  <button
                    type="button"
                    onClick={() =>
                      setSeedFiles(prev => prev.filter((_, j) => j !== i))
                    }
                    className="rounded-full p-0.5 hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <IconX size={12} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setSeedFiles([])}
                className="text-[11px] text-stone-400 hover:text-stone-600"
              >
                {t("research.experiment.clearFiles")}
              </button>
            </div>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => seedFileRef.current?.click()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 text-xs text-stone-600 dark:border-white/15 dark:text-white/55"
            >
              <IconFileUpload size={14} />
              {t("research.experiment.uploadSeed")}
            </button>
            <input
              ref={seedFileRef}
              type="file"
              multiple
              accept={RESEARCH_EXPERIMENT_ACCEPT}
              className="hidden"
              onChange={e => onPickSeedFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={importFromIdea}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-300 px-3 text-xs text-stone-600 dark:border-white/15 dark:text-white/55"
            >
              {t("research.experiment.importIdea")}
              {ideaCard ? (
                <span className="rounded-md bg-violet-700/10 px-1.5 py-0.5 text-[10px] text-violet-800 dark:bg-violet-400/10 dark:text-violet-200">
                  1
                </span>
              ) : null}
            </button>
            {ideaCard ? (
              <span className="max-w-xs truncate text-[11px] text-stone-400">
                {ideaCard.title}
              </span>
            ) : null}
            <button
              type="button"
              disabled={experimentLoading}
              onClick={draftRecipe}
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-violet-400 dark:text-stone-950 dark:hover:bg-violet-300"
            >
              {experimentLoading ? (
                <IconLoader2 size={15} className="animate-spin" />
              ) : (
                <IconSparkles size={15} />
              )}
              {t("research.experiment.draft")}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-stone-400">
            {t("research.experiment.uploadSeedHint")}
          </p>
        </div>

        {experimentError ? (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
            {experimentError}
          </p>
        ) : null}

        {!record && !experimentLoading ? (
          <p className="mt-10 text-center text-sm text-stone-400">
            {t("research.experiment.emptyHint")}
          </p>
        ) : null}

        {record ? (
          <div className="mt-6 space-y-5">
            {/* Status + gates */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-700/20 bg-violet-700/[0.08] px-2.5 py-1 text-[11px] font-medium text-violet-900 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200">
                {statusLabel(record.status)}
              </span>
              {record.ideaTitle ? (
                <span className="text-[11px] text-stone-400">
                  {record.ideaTitle}
                </span>
              ) : null}
              <div className="ml-auto flex gap-2">
                {!locked ? (
                  <button
                    type="button"
                    onClick={lockRecipe}
                    disabled={!canLockRecipe(record)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-stone-900 px-3 text-xs font-medium text-white disabled:opacity-40 dark:bg-violet-500 dark:text-stone-950"
                  >
                    <IconLock size={14} />
                    {t("research.experiment.lock")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={unlockRecipe}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-300 px-3 text-xs text-stone-600 dark:border-white/15 dark:text-white/55"
                  >
                    <IconLockOpen size={14} />
                    {t("research.experiment.unlock")}
                  </button>
                )}
              </div>
            </div>

            {(record.gates || []).filter(g => g.severity !== "CLEAR").length >
            0 ? (
              <div className="flex flex-wrap gap-1.5">
                {record.gates
                  .filter(g => g.severity !== "CLEAR")
                  .map(g => (
                    <span
                      key={g.id}
                      className={`rounded-full border px-2.5 py-1 text-[10px] ${gateTone(g.severity)}`}
                      title={g.fixHint}
                    >
                      [{g.severity}] {g.message}
                    </span>
                  ))}
              </div>
            ) : (
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] ${gateTone("CLEAR")}`}>
                {t("research.experiment.gatesClear")}
              </span>
            )}

            {/* Recipe form */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4 rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.experiment.recipeTitle")}
                </h2>
                <div className="space-y-4">
                  <ListEditor
                    label={t("research.experiment.hypotheses")}
                    values={record.hypotheses}
                    disabled={locked}
                    onChange={hypotheses => patchRecord({ hypotheses })}
                    placeholder={t("research.experiment.hypothesesPh")}
                  />
                  <div className={locked ? "opacity-70" : undefined}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                        {t("research.experiment.baselines")}
                      </span>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          updateBaselines([
                            ...record.baselines,
                            { name: "", why: "", evidenceLevel: "L2" }
                          ])
                        }
                        className="text-[10px] text-violet-700 disabled:opacity-40 dark:text-violet-300"
                      >
                        +
                      </button>
                    </div>
                    <div className="space-y-2">
                      {record.baselines.map((b, i) => (
                        <div
                          key={`baseline-${i}`}
                          className="rounded-xl border border-stone-100 p-2 dark:border-white/[0.05]"
                        >
                          <div className="flex gap-1.5">
                            <input
                              value={b.name}
                              disabled={locked}
                              placeholder={t("research.experiment.baselineName")}
                              onChange={e => {
                                const next = [...record.baselines]
                                next[i] = { ...b, name: e.target.value }
                                updateBaselines(next)
                              }}
                              className="w-full rounded-lg border border-stone-200 bg-[#fafaf8] px-2 py-1.5 text-xs disabled:cursor-not-allowed dark:border-white/10 dark:bg-black/20 dark:text-white/85"
                            />
                            <select
                              value={b.evidenceLevel || "L2"}
                              disabled={locked}
                              onChange={e => {
                                const next = [...record.baselines]
                                next[i] = {
                                  ...b,
                                  evidenceLevel: e.target
                                    .value as Baseline["evidenceLevel"]
                                }
                                updateBaselines(next)
                              }}
                              className="rounded-lg border border-stone-200 bg-white px-2 text-[10px] disabled:cursor-not-allowed dark:border-white/10 dark:bg-black/20 dark:text-white/70"
                            >
                              {["L0", "L1", "L2", "L3"].map(l => (
                                <option key={l} value={l}>
                                  {l}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() =>
                                updateBaselines(
                                  record.baselines.filter((_, j) => j !== i)
                                )
                              }
                              className="p-1 text-stone-400 hover:text-rose-500 disabled:opacity-40"
                            >
                              <IconTrash size={14} />
                            </button>
                          </div>
                          <input
                            value={b.why}
                            disabled={locked}
                            placeholder={t("research.experiment.baselineWhy")}
                            onChange={e => {
                              const next = [...record.baselines]
                              next[i] = { ...b, why: e.target.value }
                              updateBaselines(next)
                            }}
                            className="mt-1.5 w-full rounded-lg border border-stone-200 bg-[#fafaf8] px-2 py-1.5 text-xs disabled:cursor-not-allowed dark:border-white/10 dark:bg-black/20 dark:text-white/70"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <ListEditor
                    label={t("research.experiment.datasets")}
                    values={record.datasets}
                    disabled={locked}
                    onChange={datasets => patchRecord({ datasets })}
                  />
                  <ListEditor
                    label={t("research.experiment.metrics")}
                    values={record.metrics}
                    disabled={locked}
                    onChange={metrics => patchRecord({ metrics })}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.experiment.planTitle")}
                </h2>
                <div className="space-y-4">
                  <ListEditor
                    label={t("research.experiment.ablations")}
                    values={record.ablations}
                    disabled={locked}
                    onChange={ablations => patchRecord({ ablations })}
                  />
                  <ListEditor
                    label={t("research.experiment.robustness")}
                    values={record.robustnessChecks}
                    disabled={locked}
                    onChange={robustnessChecks =>
                      patchRecord({ robustnessChecks })
                    }
                  />
                  <div className={locked ? "opacity-70" : undefined}>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                      {t("research.experiment.failure")}
                    </div>
                    <textarea
                      value={record.failureCriteria}
                      disabled={locked}
                      rows={3}
                      onChange={e =>
                        patchRecord({ failureCriteria: e.target.value })
                      }
                      className="w-full resize-none rounded-xl border border-stone-200 bg-[#fafaf8] px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-violet-700/30 disabled:cursor-not-allowed dark:border-white/10 dark:bg-black/20 dark:text-white/85"
                    />
                  </div>
                  <ListEditor
                    label={t("research.experiment.artifacts")}
                    values={record.expectedArtifacts}
                    disabled={locked}
                    onChange={expectedArtifacts =>
                      patchRecord({ expectedArtifacts })
                    }
                  />
                  <div className={locked ? "opacity-70" : undefined}>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                      {t("research.experiment.compute")}
                    </div>
                    <textarea
                      value={record.computePlan || ""}
                      disabled={locked}
                      rows={2}
                      onChange={e =>
                        patchRecord({ computePlan: e.target.value })
                      }
                      className="w-full resize-none rounded-xl border border-stone-200 bg-[#fafaf8] px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-violet-700/30 disabled:cursor-not-allowed dark:border-white/10 dark:bg-black/20 dark:text-white/85"
                    />
                  </div>
                </div>
              </div>
            </div>

            {(record.checklist || []).length > 0 ? (
              <div className="rounded-2xl border border-stone-200/80 bg-white/70 px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                  {t("research.experiment.checklist")}
                </div>
                <ul className="list-disc space-y-1 pl-4 text-xs text-stone-600 dark:text-white/55">
                  {record.checklist!.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Results */}
            <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.experiment.resultsTitle")}
                </h2>
                {!locked ? (
                  <span className="text-[11px] text-stone-400">
                    {t("research.experiment.resultsLockedHint")}
                  </span>
                ) : null}
              </div>
              <div className={!locked ? "opacity-50" : undefined}>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!locked}
                    onClick={() => resultFileRef.current?.click()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 text-xs text-stone-600 disabled:opacity-40 dark:border-white/15 dark:text-white/55"
                  >
                    <IconFileUpload size={14} />
                    {t("research.experiment.uploadResults")}
                  </button>
                  <input
                    ref={resultFileRef}
                    type="file"
                    multiple
                    accept={RESEARCH_EXPERIMENT_ACCEPT}
                    className="hidden"
                    onChange={e => onPickResultFiles(e.target.files)}
                  />
                  <span className="text-[10px] text-stone-400">
                    {t("research.experiment.uploadResultsHint")}
                  </span>
                </div>

                {resultFiles.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {resultFiles.map((f, i) => (
                      <span
                        key={`${f.name}-${i}`}
                        className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
                      >
                        <span className="font-mono text-[9px] uppercase opacity-60">
                          {f.kind}
                        </span>
                        {f.name}
                        <button
                          type="button"
                          disabled={!locked}
                          onClick={() =>
                            setResultFiles(prev =>
                              prev.filter((_, j) => j !== i)
                            )
                          }
                          className="rounded-full p-0.5 hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40"
                        >
                          <IconX size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    Run log
                  </div>
                  <textarea
                    value={runLog || (record.runLogs || [])[0] || ""}
                    disabled={!locked}
                    onChange={e => setRunLog(e.target.value)}
                    rows={5}
                    placeholder={t("research.experiment.runLogPh")}
                    className="w-full resize-y rounded-xl border border-stone-200 bg-[#fafaf8] px-3 py-2 font-mono text-[11px] outline-none focus:ring-2 focus:ring-violet-700/30 disabled:cursor-not-allowed dark:border-white/10 dark:bg-black/20 dark:text-white/80"
                  />
                </div>
                <div className="mt-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    Result table
                  </div>
                  <textarea
                    value={resultTable || (record.resultTables || [])[0] || ""}
                    disabled={!locked}
                    onChange={e => setResultTable(e.target.value)}
                    rows={5}
                    placeholder={t("research.experiment.resultTablePh")}
                    className="w-full resize-y rounded-xl border border-stone-200 bg-[#fafaf8] px-3 py-2 font-mono text-[11px] outline-none focus:ring-2 focus:ring-violet-700/30 disabled:cursor-not-allowed dark:border-white/10 dark:bg-black/20 dark:text-white/80"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!locked}
                    onClick={attachResults}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-300 px-3 text-xs font-medium text-stone-700 disabled:opacity-40 dark:border-white/15 dark:text-white/70"
                  >
                    {t("research.experiment.attachResults")}
                  </button>
                  <button
                    type="button"
                    disabled={!locked || experimentLoading}
                    onClick={interpretResults}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-violet-500 dark:text-stone-950"
                  >
                    {experimentLoading ? (
                      <IconLoader2 size={15} className="animate-spin" />
                    ) : (
                      <IconScale size={15} />
                    )}
                    {t("research.experiment.interpret")}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-stone-400">
                  {t("research.experiment.honestyHint")}
                </p>
              </div>
            </div>

            {/* Interpretation */}
            {record.interpretation ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <h2 className="mb-3 text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.experiment.interpTitle")}
                </h2>
                {record.interpretation.summary ? (
                  <p className="mb-3 text-sm text-stone-600 dark:text-white/55">
                    {record.interpretation.summary}
                  </p>
                ) : null}
                <div className="space-y-2">
                  {(record.interpretation.hypothesisOutcomes || []).map(
                    (o, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-stone-100 px-3 py-2 text-xs dark:border-white/[0.05]"
                      >
                        <span
                          className={`mr-2 rounded-md px-1.5 py-0.5 font-mono text-[10px] ${
                            o.outcome === "support"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : o.outcome === "reject"
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                          }`}
                        >
                          {o.outcome}
                        </span>
                        <span className="font-medium text-stone-800 dark:text-white/80">
                          {o.hypothesis}
                        </span>
                        <p className="mt-1 text-stone-500 dark:text-white/45">
                          {o.note}
                        </p>
                      </div>
                    )
                  )}
                </div>
                {(record.interpretation.claimChecks || []).length > 0 ? (
                  <div className="mt-4 space-y-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                      {t("research.experiment.claims")}
                    </div>
                    {record.interpretation.claimChecks!.map((c, i) => (
                      <div
                        key={i}
                        className="flex flex-wrap items-start gap-2 text-xs text-stone-600 dark:text-white/55"
                      >
                        <span className="shrink-0 font-mono text-[10px] text-stone-400">
                          {c.verdict}
                        </span>
                        {c.claim}
                      </div>
                    ))}
                  </div>
                ) : null}
                {(record.interpretation.risks || []).length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-amber-800 dark:text-amber-200">
                    {record.interpretation.risks!.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
    </ModulePageShell>
  )
}
