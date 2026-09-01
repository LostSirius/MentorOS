"use client"

import { ChatbotUIContext } from "@/context/context"
import { CopilotContext } from "@/context/copilot-context"
import { resolveModelProvider } from "@/lib/copilot-generator"
import { emitPetEvent } from "@/lib/desktop-pet/events"
import { RESEARCH_DOC_AND_IMAGE_ACCEPT } from "@/lib/research-uploads"
import {
  buildCandidateFromText,
  canAdvanceToExperiment,
  ideaWorkspaceToMarkdown,
  SCORE_KEYS,
  type IdeaCandidate,
  type IdeaCard,
  type IdeaCapability,
  type IdeaPaperType,
  type IdeaScores
} from "@/lib/idea-types"
import {
  exportTextArtifact,
  stampFilename
} from "@/lib/research-export"
import { moduleAccent } from "@/lib/research-module-accents"
import {
  IconArrowRight,
  IconBulb,
  IconCheck,
  IconFileUpload,
  IconFlask,
  IconLoader2,
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

type Phase = "brainstorm" | "evaluate"

const PAPER_TYPE_KEYS: Record<IdeaPaperType, string> = {
  novel_problem: "research.idea.types.novel_problem",
  novel_method: "research.idea.types.novel_method",
  new_setting: "research.idea.types.new_setting",
  other: "research.idea.types.other"
}

const VERDICT_KEYS: Record<IdeaCard["verdict"], string> = {
  strong_accept: "research.idea.verdicts.strong_accept",
  accept_with_revisions: "research.idea.verdicts.accept_with_revisions",
  reject_and_pivot: "research.idea.verdicts.reject_and_pivot"
}

/** One shared palette for radar labels, dots, and legend pills. */
const DIM_COLORS: Record<keyof IdeaScores, string> = {
  higher: "#2dd4bf", // teal-400
  faster: "#fb923c", // orange-400
  stronger: "#fb7185", // rose-400
  cheaper: "#60a5fa", // blue-400
  broader: "#facc15" // yellow-400
}

function FiveDimRadar({
  scores,
  labels
}: {
  scores: IdeaScores
  labels: Record<keyof IdeaScores, string>
}) {
  const size = 240
  const cx = size / 2
  const cy = size / 2
  const maxR = 78
  const keys = SCORE_KEYS
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / keys.length

  const ring = (level: number) =>
    keys
      .map((_k, i) => {
        const a = angle(i)
        const r = (maxR * level) / 5
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
      })
      .join(" ")

  const poly = keys
    .map((k, i) => {
      const a = angle(i)
      const r = (maxR * Math.min(5, Math.max(1, scores[k].score))) / 5
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
    })
    .join(" ")

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto h-56 w-56"
        role="img"
        aria-label="Five-dimension scores"
      >
        {[1, 2, 3, 4, 5].map(level => (
          <polygon
            key={level}
            points={ring(level)}
            fill="none"
            className="stroke-stone-200 dark:stroke-white/10"
            strokeWidth={1}
          />
        ))}
        {keys.map((k, i) => {
          const a = angle(i)
          const x = cx + maxR * Math.cos(a)
          const y = cy + maxR * Math.sin(a)
          return (
            <line
              key={k}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={DIM_COLORS[k]}
              strokeOpacity={0.35}
              strokeWidth={1.25}
            />
          )
        })}
        <polygon
          points={poly}
          fill="rgba(45,212,191,0.14)"
          stroke="#2dd4bf"
          strokeWidth={2}
        />
        {keys.map((k, i) => {
          const a = angle(i)
          const score = Math.min(5, Math.max(1, scores[k].score))
          const r = (maxR * score) / 5
          const px = cx + r * Math.cos(a)
          const py = cy + r * Math.sin(a)
          const lx = cx + (maxR + 26) * Math.cos(a)
          const ly = cy + (maxR + 26) * Math.sin(a)
          const color = DIM_COLORS[k]
          return (
            <g key={`pt-${k}`}>
              <circle
                cx={px}
                cy={py}
                r={4}
                fill={color}
                stroke="#0b0d10"
                strokeWidth={1.5}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                fontSize={11}
                fontWeight={700}
              >
                {labels[k]}
              </text>
              <text
                x={lx}
                y={ly + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                fontSize={10}
                fontWeight={600}
                opacity={0.9}
              >
                {score}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {keys.map(k => (
          <span
            key={`leg-${k}`}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            style={{
              color: DIM_COLORS[k],
              backgroundColor: `${DIM_COLORS[k]}22`
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: DIM_COLORS[k] }}
            />
            {labels[k]}
          </span>
        ))}
      </div>
    </div>
  )
}

export const IdeaResearchPage: FC = () => {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith("zh") ? "zh" : "en"
  const accent = moduleAccent("idea")

  const {
    literatureReview,
    ideaCandidates,
    setIdeaCandidates,
    ideaCard,
    setIdeaCard,
    ideaLoading,
    setIdeaLoading,
    ideaError,
    setIdeaError
  } = useContext(CopilotContext)

  const {
    chatSettings,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const [seed, setSeed] = useState("")
  const [files, setFiles] = useState<{ name: string; text: string }[]>([])
  const [importPaperType, setImportPaperType] =
    useState<IdeaPaperType>("other")
  const fileRef = useRef<HTMLInputElement>(null)
  const [capability, setCapability] = useState<IdeaCapability>({
    hoursPerWeek: 20,
    compute: "",
    deadlineWeeks: 12,
    notes: ""
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [forceConfirm, setForceConfirm] = useState(false)
  const [sentToExperiment, setSentToExperiment] = useState(false)

  const litGaps = useMemo(
    () => literatureReview?.review?.gaps?.filter(Boolean) || [],
    [literatureReview]
  )
  const litTopic = literatureReview?.topic || ""

  const documentContext = useMemo(
    () =>
      files
        .map(f => `--- File: ${f.name} ---\n${f.text}`)
        .join("\n\n")
        .slice(0, 24000),
    [files]
  )

  const composedImportText = useMemo(() => {
    return [seed.trim(), documentContext].filter(Boolean).join("\n\n").trim()
  }, [seed, documentContext])

  const selected = useMemo(
    () => ideaCandidates.find(c => c.id === selectedId) || null,
    [ideaCandidates, selectedId]
  )

  const dimLabels = useMemo(
    () =>
      ({
        higher: t("research.idea.dims.higher"),
        faster: t("research.idea.dims.faster"),
        stronger: t("research.idea.dims.stronger"),
        cheaper: t("research.idea.dims.cheaper"),
        broader: t("research.idea.dims.broader")
      }) as Record<keyof IdeaScores, string>,
    [t]
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
        name.endsWith(".tex") ||
        name.endsWith(".bib") ||
        name.endsWith(".yaml") ||
        name.endsWith(".yml") ||
        name.endsWith(".xml") ||
        name.endsWith(".html") ||
        name.endsWith(".htm") ||
        name.endsWith(".log") ||
        name.endsWith(".out") ||
        name.endsWith(".rtf") ||
        name.endsWith(".ipynb")
      ) {
        return file.text()
      }
      if (file.type.startsWith("image/")) {
        return t("research.idea.imageNote", { name: file.name })
      }
      if (name.endsWith(".pdf") || name.endsWith(".docx")) {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/extract-text", {
          method: "POST",
          body: form
        })
        if (!res.ok) return t("research.idea.fileFail", { name: file.name })
        const data = await res.json()
        return data.text || t("research.idea.fileOk", { name: file.name })
      }
      return t("research.idea.attachment", { name: file.name })
    },
    [t]
  )

  const onPickFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return
      const next: { name: string; text: string }[] = []
      for (const file of Array.from(list)) {
        const text = await extractFileText(file)
        next.push({ name: file.name, text: text.slice(0, 16000) })
      }
      setFiles(prev => [...prev, ...next])
      toast.success(t("research.idea.toastFiles", { count: next.length }))
      if (fileRef.current) fileRef.current.value = ""
    },
    [extractFileText, t]
  )

  const importFromLiterature = () => {
    if (!litGaps.length && !litTopic) {
      toast.error(t("research.idea.toastNoLiterature"))
      return
    }
    const gapBlock = litGaps.slice(0, 5).map((g, i) => `${i + 1}. ${g}`).join("\n")
    const next = [
      litTopic
        ? locale === "zh"
          ? `基于文献主题「${litTopic}」`
          : `Based on literature topic “${litTopic}”`
        : "",
      gapBlock
        ? locale === "zh"
          ? `研究缺口：\n${gapBlock}`
          : `Research gaps:\n${gapBlock}`
        : ""
    ]
      .filter(Boolean)
      .join("\n\n")
    setSeed(prev => (prev.trim() ? `${prev.trim()}\n\n${next}` : next))
    toast.success(t("research.idea.toastImported"))
  }

  const callIdeaApi = async (phase: Phase, candidate?: IdeaCandidate) => {
    if (!chatSettings) {
      toast.error(t("research.idea.toastNeedModel"))
      return null
    }
    const { provider, customModelId } = resolveProvider()
    const res = await fetch("/api/idea", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phase,
        seed: seed.trim() || candidate?.oneLiner || "",
        documentContext:
          phase === "brainstorm"
            ? documentContext || undefined
            : candidate?.notes ||
              (candidate?.source === "document" || candidate?.source === "text"
                ? documentContext || undefined
                : undefined),
        gaps: litGaps,
        researchQuestions: [],
        literatureTopic: litTopic || undefined,
        candidate,
        capability,
        chatSettings,
        provider,
        customModelId,
        locale
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || t("research.idea.toastFail"))
    return data
  }

  const addImportedCandidate = () => {
    if (!composedImportText) {
      toast.error(t("research.idea.toastNeedSeed"))
      return
    }
    const source: IdeaCandidate["source"] = files.length
      ? "document"
      : "text"
    const candidate = buildCandidateFromText(composedImportText, {
      source,
      sourceName: files[0]?.name || (locale === "zh" ? "文字导入" : "text import"),
      paperType: importPaperType,
      id: `I${Date.now().toString(36)}`
    })
    if (!candidate) {
      toast.error(t("research.idea.toastNeedSeed"))
      return
    }
    setIdeaCandidates(prev => [candidate, ...prev])
    setSelectedId(candidate.id)
    setIdeaCard(null)
    setSentToExperiment(false)
    toast.success(t("research.idea.toastAddedCandidate"))
  }

  const runBrainstorm = async () => {
    if (!composedImportText && !litGaps.length) {
      toast.error(t("research.idea.toastNeedSeed"))
      return
    }
    setIdeaLoading(true)
    setIdeaError(null)
    setIdeaCard(null)
    setSentToExperiment(false)
    try {
      const data = await callIdeaApi("brainstorm")
      const list = (data?.candidates || []) as IdeaCandidate[]
      setIdeaCandidates(list)
      setSelectedId(list[0]?.id || null)
      setCompareIds([])
      if (data?.warning) toast.message(data.warning)
      toast.success(t("research.idea.toastBrainstormDone", { count: list.length }))
    } catch (e: any) {
      const msg = e?.message || t("research.idea.toastFail")
      setIdeaError(msg)
      toast.error(msg)
    } finally {
      setIdeaLoading(false)
    }
  }

  const runEvaluate = async (candidateOverride?: IdeaCandidate) => {
    const target = candidateOverride || selected
    if (!target) {
      toast.error(t("research.idea.toastNeedSelect"))
      return
    }
    setIdeaLoading(true)
    setIdeaError(null)
    setSentToExperiment(false)
    try {
      const data = await callIdeaApi("evaluate", target)
      const card = data?.card as IdeaCard
      setIdeaCard(card)
      if (data?.warning) toast.message(data.warning)
      toast.success(t("research.idea.toastEvaluateDone"))
    } catch (e: any) {
      const msg = e?.message || t("research.idea.toastFail")
      setIdeaError(msg)
      toast.error(msg)
    } finally {
      setIdeaLoading(false)
    }
  }

  /** Paste/upload → create candidate → evaluate immediately (skip brainstorm). */
  const runEvaluateDirect = async () => {
    if (!composedImportText) {
      toast.error(t("research.idea.toastNeedSeed"))
      return
    }
    if (!chatSettings) {
      toast.error(t("research.idea.toastNeedModel"))
      return
    }
    const source: IdeaCandidate["source"] = files.length
      ? "document"
      : "text"
    const candidate = buildCandidateFromText(composedImportText, {
      source,
      sourceName: files[0]?.name || (locale === "zh" ? "直接评估" : "direct evaluate"),
      paperType: importPaperType,
      id: `I${Date.now().toString(36)}`
    })
    if (!candidate) {
      toast.error(t("research.idea.toastNeedSeed"))
      return
    }
    setIdeaCandidates(prev => {
      const exists = prev.some(c => c.id === candidate.id)
      return exists ? prev : [candidate, ...prev]
    })
    setSelectedId(candidate.id)
    await runEvaluate(candidate)
  }

  const updateCandidate = (id: string, patch: Partial<IdeaCandidate>) => {
    setIdeaCandidates(prev =>
      prev.map(c => (c.id === id ? { ...c, ...patch } : c))
    )
  }

  const removeCandidate = (id: string) => {
    setIdeaCandidates(prev => prev.filter(c => c.id !== id))
    if (selectedId === id) setSelectedId(null)
    setCompareIds(prev => prev.filter(x => x !== id))
    if (ideaCard?.candidateId === id) setIdeaCard(null)
  }

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) {
        toast.message(t("research.idea.toastCompareLimit"))
        return prev
      }
      return [...prev, id]
    })
  }

  const exportMarkdown = async () => {
    if (!ideaCard && !ideaCandidates.length) {
      toast.error(t("research.idea.toastNothingToExport"))
      return
    }
    const md = ideaWorkspaceToMarkdown({ ideaCard, ideaCandidates })
    const ok = await exportTextArtifact({
      filename: stampFilename("idea", "md"),
      content: md,
      mime: "text/markdown;charset=utf-8"
    })
    toast.success(
      ok ? t("research.idea.toastExport") : t("research.idea.toastExportDownload")
    )
  }

  const exportJson = async () => {
    if (!ideaCard && !ideaCandidates.length) {
      toast.error(t("research.idea.toastNothingToExport"))
      return
    }
    const payload = { version: 1 as const, ideaCard, ideaCandidates }
    const ok = await exportTextArtifact({
      filename: stampFilename("idea", "json"),
      content: JSON.stringify(payload, null, 2),
      mime: "application/json"
    })
    toast.success(
      ok
        ? t("research.idea.toastExportJson")
        : t("research.idea.toastExportDownload")
    )
  }

  const sendToExperiment = () => {
    if (!ideaCard) return
    const ok = canAdvanceToExperiment(ideaCard, forceConfirm)
    if (!ok) {
      toast.error(t("research.idea.toastBlocked"))
      return
    }
    setSentToExperiment(true)
    toast.success(
      forceConfirm && !canAdvanceToExperiment(ideaCard, false)
        ? t("research.idea.toastForced")
        : t("research.idea.toastSent")
    )
    emitPetEvent({ type: "research-progress", growth: "idea_done" })
  }

  const verdictTone = (v: IdeaCard["verdict"]) => {
    if (v === "strong_accept")
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
    if (v === "reject_and_pivot")
      return "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
    return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
  }

  return (
    <ModulePageShell>
      <ModulePageHeader
        moduleId="idea"
        badge={
          <div
            className={`mb-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badge}`}
          >
            <IconBulb size={12} />
            {t("research.idea.badge")}
          </div>
        }
        title={t("research.idea.title")}
        subtitle={t("research.idea.subtitle")}
        actions={
          <ModuleExportActions
            onExportMd={exportMarkdown}
            onExportJson={exportJson}
            disabled={!ideaCard && ideaCandidates.length === 0}
          />
        }
      />

        {/* Seed + import + capability */}
        <div className="mt-5 rounded-3xl border border-stone-200/90 bg-white/90 p-3 shadow-[0_1px_0_rgba(0,0,0,0.03)] backdrop-blur dark:border-white/[0.08] dark:bg-[#12151a]/90">
          <textarea
            value={seed}
            onChange={e => setSeed(e.target.value)}
            rows={5}
            placeholder={t("research.idea.seedPlaceholder")}
            className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 text-sm outline-none ring-indigo-700/30 placeholder:text-stone-400 focus:ring-2 dark:border-white/10 dark:bg-black/20 dark:text-white/90"
          />

          {files.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
                >
                  {f.name}
                  <button
                    type="button"
                    onClick={() =>
                      setFiles(prev => prev.filter((_, j) => j !== i))
                    }
                    className="rounded-full p-0.5 hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <IconX size={12} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-[11px] text-stone-400 hover:text-stone-600"
              >
                {t("research.idea.clearFiles")}
              </button>
            </div>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 text-xs text-stone-600 dark:border-white/15 dark:text-white/55"
            >
              <IconFileUpload size={14} />
              {t("research.idea.upload")}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={RESEARCH_DOC_AND_IMAGE_ACCEPT}
              className="hidden"
              onChange={e => onPickFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={importFromLiterature}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-300 px-3 text-xs text-stone-600 dark:border-white/15 dark:text-white/55"
            >
              {t("research.idea.importLiterature")}
              {litGaps.length > 0 ? (
                <span className="rounded-md bg-indigo-700/10 px-1.5 py-0.5 text-[10px] text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200">
                  {litGaps.length}
                </span>
              ) : null}
            </button>
            <label className="inline-flex h-9 items-center gap-1.5 text-[11px] text-stone-500">
              {t("research.idea.importType")}
              <select
                value={importPaperType}
                onChange={e =>
                  setImportPaperType(e.target.value as IdeaPaperType)
                }
                className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs outline-none dark:border-white/10 dark:bg-black/20 dark:text-white/70"
              >
                {(
                  [
                    "novel_problem",
                    "novel_method",
                    "new_setting",
                    "other"
                  ] as IdeaPaperType[]
                ).map(pt => (
                  <option key={pt} value={pt}>
                    {t(PAPER_TYPE_KEYS[pt])}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-2.5 flex flex-col gap-2.5 border-t border-stone-100 pt-2.5 dark:border-white/[0.05]">
            <div className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
              {t("research.idea.capabilityTitle")}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="block text-[11px] text-stone-500">
                {t("research.idea.hoursPerWeek")}
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={capability.hoursPerWeek ?? ""}
                  onChange={e =>
                    setCapability(c => ({
                      ...c,
                      hoursPerWeek: Number(e.target.value) || undefined
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-700/30 dark:border-white/10 dark:bg-black/20 dark:text-white/85"
                />
              </label>
              <label className="block text-[11px] text-stone-500">
                {t("research.idea.deadlineWeeks")}
                <input
                  type="number"
                  min={1}
                  max={104}
                  value={capability.deadlineWeeks ?? ""}
                  onChange={e =>
                    setCapability(c => ({
                      ...c,
                      deadlineWeeks: Number(e.target.value) || undefined
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-700/30 dark:border-white/10 dark:bg-black/20 dark:text-white/85"
                />
              </label>
              <label className="block text-[11px] text-stone-500">
                {t("research.idea.compute")}
                <input
                  value={capability.compute || ""}
                  onChange={e =>
                    setCapability(c => ({ ...c, compute: e.target.value }))
                  }
                  placeholder={t("research.idea.computePlaceholder")}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-700/30 dark:border-white/10 dark:bg-black/20 dark:text-white/85"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={ideaLoading || !composedImportText}
                onClick={addImportedCandidate}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 text-xs font-medium text-stone-700 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white/70"
              >
                {t("research.idea.addCandidate")}
              </button>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={ideaLoading}
                  onClick={runBrainstorm}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 transition hover:bg-stone-50 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
                >
                  {ideaLoading ? (
                    <IconLoader2 size={15} className="animate-spin" />
                  ) : (
                    <IconSparkles size={15} />
                  )}
                  {t("research.idea.brainstorm")}
                </button>
                <button
                  type="button"
                  disabled={ideaLoading || !composedImportText}
                  onClick={runEvaluateDirect}
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-indigo-400 dark:text-stone-950 dark:hover:bg-indigo-300"
                >
                  {ideaLoading ? (
                    <IconLoader2 size={15} className="animate-spin" />
                  ) : (
                    <IconScale size={15} />
                  )}
                  {t("research.idea.evaluateDirect")}
                </button>
                <button
                  type="button"
                  disabled={ideaLoading || !selected}
                  onClick={() => runEvaluate()}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 transition hover:bg-stone-50 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
                >
                  <IconScale size={15} />
                  {t("research.idea.evaluate")}
                </button>
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-stone-400">
              {t("research.idea.importHint")}
            </p>
          </div>
        </div>

        {ideaError ? (
          <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{ideaError}</p>
        ) : null}

        {ideaLoading && !ideaCandidates.length ? (
          <div className="mt-10 flex flex-col items-center gap-3 py-12">
            <div className="size-12 animate-spin rounded-full border-2 border-indigo-700/20 border-t-indigo-700 dark:border-indigo-400/20 dark:border-t-indigo-300" />
            <p className="text-sm text-stone-500">{t("research.idea.loading")}</p>
          </div>
        ) : null}

        {!ideaCandidates.length && !ideaLoading ? (
          <p className="mt-10 text-center text-sm text-stone-400">
            {t("research.idea.emptyHint")}
          </p>
        ) : null}

        {/* Two-column: candidates | evaluation */}
        {ideaCandidates.length > 0 ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.idea.candidatesTitle", {
                    count: ideaCandidates.length
                  })}
                </h2>
                <span className="text-[10px] uppercase tracking-wide text-stone-400">
                  {t("research.idea.phaseA")}
                </span>
              </div>

              <div className="space-y-3">
                {ideaCandidates.map(c => {
                  const active = selectedId === c.id
                  const comparing = compareIds.includes(c.id)
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`rounded-2xl border p-3.5 transition ${
                        active
                          ? "border-indigo-600/40 bg-indigo-700/[0.06] dark:border-indigo-400/35 dark:bg-indigo-400/5"
                          : "border-stone-200/90 bg-white dark:border-white/[0.07] dark:bg-[#12151a]"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[10px] text-stone-400">
                              {c.id}
                            </span>
                            <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600 dark:bg-white/5 dark:text-white/50">
                              {t(PAPER_TYPE_KEYS[c.paperType])}
                            </span>
                            {c.source && c.source !== "brainstorm" ? (
                              <span className="rounded-md bg-indigo-700/10 px-1.5 py-0.5 text-[10px] text-indigo-800 dark:bg-indigo-400/10 dark:text-indigo-200">
                                {t(`research.idea.sources.${c.source}`)}
                              </span>
                            ) : null}
                          </div>
                          <input
                            value={c.title}
                            onClick={e => e.stopPropagation()}
                            onChange={e =>
                              updateCandidate(c.id, { title: e.target.value })
                            }
                            className="mt-1.5 w-full bg-transparent text-sm font-medium text-stone-900 outline-none dark:text-white/90"
                          />
                          <textarea
                            value={c.oneLiner}
                            rows={2}
                            onClick={e => e.stopPropagation()}
                            onChange={e =>
                              updateCandidate(c.id, {
                                oneLiner: e.target.value
                              })
                            }
                            className="mt-1 w-full resize-none bg-transparent text-xs leading-relaxed text-stone-500 outline-none dark:text-white/55"
                          />
                          {c.inspiration ? (
                            <p className="mt-1 text-[10px] text-stone-400">
                              {t("research.idea.inspiration")}: {c.inspiration}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            type="button"
                            title={t("research.idea.compare")}
                            onClick={e => {
                              e.stopPropagation()
                              toggleCompare(c.id)
                            }}
                            className={`rounded-lg px-2 py-1 text-[10px] ${
                              comparing
                                ? "bg-indigo-700 text-white dark:bg-indigo-400 dark:text-stone-950"
                                : "bg-stone-100 text-stone-500 dark:bg-white/5 dark:text-white/45"
                            }`}
                          >
                            {t("research.idea.compareShort")}
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation()
                              removeCandidate(c.id)
                            }}
                            className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-500/10 hover:text-rose-500"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {compareIds.length >= 2 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 p-3 dark:border-white/15">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                    {t("research.idea.compareMode")}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {compareIds.map(id => {
                      const c = ideaCandidates.find(x => x.id === id)
                      if (!c) return null
                      return (
                        <div
                          key={id}
                          className="rounded-xl bg-stone-50 p-2.5 dark:bg-white/[0.03]"
                        >
                          <div className="font-mono text-[10px] text-stone-400">
                            {c.id}
                          </div>
                          <div className="mt-0.5 text-xs font-medium text-stone-800 dark:text-white/80">
                            {c.title}
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-white/45">
                            {c.oneLiner}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.idea.evalTitle")}
                </h2>
                <span className="text-[10px] uppercase tracking-wide text-stone-400">
                  {t("research.idea.phaseB")}
                </span>
              </div>

              {!ideaCard ? (
                <div className="rounded-[1.35rem] border border-dashed border-stone-300 bg-white/60 px-5 py-12 text-center dark:border-white/10 dark:bg-[#12151a]/60">
                  <IconScale
                    size={28}
                    className="mx-auto mb-3 text-stone-300 dark:text-white/25"
                  />
                  <p className="text-sm text-stone-500 dark:text-white/45">
                    {t("research.idea.evalEmpty")}
                  </p>
                </div>
              ) : (
                <div
                  key={ideaCard.createdAt}
                  className="rounded-[1.35rem] border border-stone-200/90 bg-white p-5 dark:border-white/[0.07] dark:bg-[#12151a]"
                >
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${verdictTone(ideaCard.verdict)}`}
                  >
                    <IconCheck size={12} />
                    {t(VERDICT_KEYS[ideaCard.verdict])}
                  </div>
                  <h3 className="mt-3 font-serif text-lg text-stone-900 dark:text-white/95">
                    {ideaCard.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-white/55">
                    {ideaCard.oneLiner}
                  </p>
                  <div className="mt-2 text-[11px] text-stone-400">
                    {t(PAPER_TYPE_KEYS[ideaCard.paperType])}
                    {ideaCard.venueSuggestion
                      ? ` · ${ideaCard.venueSuggestion}`
                      : ""}
                  </div>

                  <div className="mt-4">
                    <FiveDimRadar scores={ideaCard.scores} labels={dimLabels} />
                  </div>

                  <div className="mt-3 space-y-2">
                    {SCORE_KEYS.map(k => (
                      <div
                        key={k}
                        className="rounded-xl px-2.5 py-2 text-xs"
                        style={{ backgroundColor: `${DIM_COLORS[k]}18` }}
                      >
                        <span
                          className="inline-flex items-center gap-1.5 font-semibold"
                          style={{ color: DIM_COLORS[k] }}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: DIM_COLORS[k] }}
                          />
                          {dimLabels[k]} · {ideaCard.scores[k].score}/5
                        </span>
                        <p className="mt-0.5 text-stone-600 dark:text-white/50">
                          {ideaCard.scores[k].rationale}
                        </p>
                      </div>
                    ))}
                  </div>

                  {ideaCard.fatalFlaws.length > 0 ? (
                    <div className="mt-4">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                        {t("research.idea.fatalFlaws")}
                      </div>
                      <div className="space-y-2">
                        {ideaCard.fatalFlaws.map((f, i) => (
                          <div
                            key={`${f.id}-${i}`}
                            className={`rounded-xl border px-3 py-2 text-xs ${
                              f.severity === "FATAL"
                                ? "border-rose-500/25 bg-rose-500/5 text-rose-900 dark:text-rose-200"
                                : "border-amber-500/25 bg-amber-500/5 text-amber-900 dark:text-amber-200"
                            }`}
                          >
                            <div className="font-mono text-[10px] opacity-70">
                              {f.id} · {f.severity}
                            </div>
                            <p className="mt-0.5">{f.detail}</p>
                            {f.mitigation ? (
                              <p className="mt-1 opacity-80">
                                → {f.mitigation}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                      {t("research.idea.rqs")}
                    </div>
                    {ideaCard.researchQuestions.map(q => (
                      <p
                        key={q.id}
                        className="text-xs leading-relaxed text-stone-600 dark:text-white/55"
                      >
                        <span className="font-mono text-stone-400">{q.id}</span>{" "}
                        {q.text}
                      </p>
                    ))}
                    <div className="pt-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                      {t("research.idea.hypotheses")}
                    </div>
                    {ideaCard.hypotheses.map((h, i) => (
                      <p
                        key={i}
                        className="text-xs leading-relaxed text-stone-600 dark:text-white/55"
                      >
                        {h}
                      </p>
                    ))}
                  </div>

                  {ideaCard.capabilityFit ? (
                    <p className="mt-3 text-xs text-stone-500 dark:text-white/45">
                      <span className="font-medium text-stone-600 dark:text-white/60">
                        {t("research.idea.capabilityFit")}:{" "}
                      </span>
                      {ideaCard.capabilityFit}
                    </p>
                  ) : null}

                  {ideaCard.revisionAdvice?.length ? (
                    <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-stone-500 dark:text-white/45">
                      {ideaCard.revisionAdvice.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  ) : null}

                  {ideaCard.gates.filter(g => g.severity !== "CLEAR").length >
                  0 ? (
                    <div className="mt-4 space-y-1.5">
                      {ideaCard.gates
                        .filter(g => g.severity !== "CLEAR")
                        .map(g => (
                          <div
                            key={g.id}
                            className="flex items-start gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5 text-[11px] dark:bg-white/[0.03]"
                          >
                            <span className="shrink-0 font-mono text-stone-400">
                              {g.severity}
                            </span>
                            <span className="text-stone-600 dark:text-white/55">
                              {g.message}
                              {g.fixHint ? ` — ${g.fixHint}` : ""}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-col gap-2 border-t border-stone-100 pt-4 dark:border-white/[0.05]">
                    <label className="flex items-center gap-2 text-[11px] text-stone-500">
                      <input
                        type="checkbox"
                        checked={forceConfirm}
                        onChange={e => setForceConfirm(e.target.checked)}
                        className="rounded border-stone-300"
                      />
                      {t("research.idea.forceConfirm")}
                    </label>
                    <button
                      type="button"
                      onClick={sendToExperiment}
                      disabled={
                        !canAdvanceToExperiment(ideaCard, forceConfirm)
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-stone-900 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-40 dark:bg-indigo-400 dark:text-stone-950 dark:hover:bg-indigo-300"
                    >
                      <IconFlask size={16} />
                      {t("research.idea.sendExperiment")}
                      <IconArrowRight size={14} />
                    </button>
                    {sentToExperiment ? (
                      <p className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                        <IconCheck size={12} />
                        {t("research.idea.handoffReady")}
                      </p>
                    ) : null}
                    {!canAdvanceToExperiment(ideaCard, false) ? (
                      <p className="text-[11px] text-stone-400">
                        {t("research.idea.gateHint")}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
    </ModulePageShell>
  )
}
