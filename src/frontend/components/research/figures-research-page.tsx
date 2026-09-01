"use client"

import { ChatbotUIContext } from "@/context/context"
import { CopilotContext } from "@/context/copilot-context"
import { resolveModelProvider } from "@/lib/copilot-generator"
import { emitPetEvent } from "@/lib/desktop-pet/events"
import {
  isImageGenConfigured,
  loadImageGenSettings,
  saveImageGenSettings,
  type ImageGenSettings
} from "@/lib/image-gen-settings"
import {
  FIGURE_DELIVERABLES,
  FIGURE_QC_KEYS,
  FIGURE_TYPES,
  buildFigureGates,
  emptyFigureSession,
  emptyFigureSpec,
  emptyQc,
  figureToMarkdown,
  figuresSessionToMarkdown,
  qcComplete,
  qcPassedCount,
  upsertFigure,
  type FigureDeliverable,
  type FigureQcKey,
  type FigureSpec,
  type FigureType
} from "@/lib/figure-types"
import { persistSessionFigureImage } from "@/lib/research-archive"
import { moduleAccent } from "@/lib/research-module-accents"
import {
  exportTextArtifact,
  stampFilename
} from "@/lib/research-export"
import { useFigureImageUrl } from "@/lib/use-figure-image-url"
import {
  IconChartBar,
  IconCopy,
  IconLoader2,
  IconPlus,
  IconSparkles,
  IconTrash
} from "@tabler/icons-react"
import { FC, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { FigureChartPreview } from "./figure-chart-preview"
import {
  ModuleExportActions,
  ModulePageHeader
} from "./module-export-actions"
import { ModulePageShell } from "./module-page-shell"

function gateTone(sev: string) {
  if (sev === "BLOCK")
    return "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
  if (sev === "WARN")
    return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
  if (sev === "CLEAR")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
  return "border-stone-200 bg-stone-50 text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
}

/** Figures & visualization: three core paper figures + QC checklist. */
export const FiguresResearchPage: FC = () => {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith("zh") ? "zh" : "en"
  const accent = moduleAccent("figures")

  const {
    ideaCard,
    experimentRecord,
    writingSession,
    figureSession,
    setFigureSession,
    figuresLoading,
    setFiguresLoading,
    figuresError,
    setFiguresError
  } = useContext(CopilotContext)

  const {
    chatSettings,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const figures = figureSession?.figures || []
  const active =
    figures.find(f => f.id === figureSession?.activeId) || figures[0] || null
  const { src: activeImageSrc, status: activeImageStatus } = useFigureImageUrl(
    active?.imageUrl
  )

  const [type, setType] = useState<FigureType>("motivated_example")
  const [claim, setClaim] = useState("")
  const [userNotes, setUserNotes] = useState("")
  const [deliverable, setDeliverable] =
    useState<FigureDeliverable>("design")
  const [dataPayload, setDataPayload] = useState("")
  const [codeLanguage, setCodeLanguage] = useState("python")
  const [imageGen, setImageGen] = useState<ImageGenSettings>(() =>
    loadImageGenSettings()
  )
  const [imageLoading, setImageLoading] = useState(false)
  const [promptDraft, setPromptDraft] = useState("")

  useEffect(() => {
    setImageGen(loadImageGenSettings())
  }, [])

  const imageConfigured = isImageGenConfigured(imageGen)

  const persistImageGen = (next: ImageGenSettings) => {
    setImageGen(next)
    saveImageGenSettings(next)
  }

  const hasExperimentResults = useMemo(() => {
    if (!experimentRecord) return false
    return (
      (experimentRecord.runLogs || []).some(x => String(x || "").trim()) ||
      (experimentRecord.resultTables || []).some(x => String(x || "").trim())
    )
  }, [experimentRecord])

  const selectFigure = useCallback(
    (id: string) => {
      const fig = (figureSession?.figures || []).find(f => f.id === id)
      if (!fig) return
      setType(fig.type)
      setClaim(fig.claim)
      setUserNotes("")
      setDeliverable(fig.deliverable || "design")
      setDataPayload(fig.dataPayload || "")
      setCodeLanguage(fig.codeLanguage || "python")
      setPromptDraft(fig.promptArtifact || "")
      setFigureSession(prev => {
        const base = prev || emptyFigureSession()
        if (!base.figures.some(f => f.id === id)) return base
        return { ...base, activeId: id }
      })
    },
    [figureSession?.figures, setFigureSession]
  )

  // Keep form locals aligned when active figure changes (archive load / delete).
  useEffect(() => {
    if (!active) return
    setType(active.type)
    setClaim(active.claim)
    setDeliverable(active.deliverable || "design")
    setDataPayload(active.dataPayload || "")
    setCodeLanguage(active.codeLanguage || "python")
    setPromptDraft(active.promptArtifact || "")
  }, [active?.id, active?.createdAt])

  const patchActive = useCallback(
    (patch: Partial<FigureSpec>) => {
      setFigureSession(prev => {
        const base = prev || emptyFigureSession()
        const cur =
          base.figures.find(f => f.id === base.activeId) || base.figures[0]
        if (!cur) return base
        const next = emptyFigureSpec(
          locale as "en" | "zh",
          { ...cur, ...patch, id: cur.id },
          { hasExperimentResults }
        )
        return upsertFigure(base, next)
      })
    },
    [setFigureSession, locale, hasExperimentResults]
  )

  const toggleQc = (key: FigureQcKey) => {
    if (!active) return
    const prevComplete = qcComplete(active.qc)
    const qc = { ...active.qc, [key]: !active.qc[key] }
    patchActive({
      qc,
      gates: buildFigureGates(
        { ...active, qc },
        { hasExperimentResults }
      )
    })
    if (!prevComplete && qcComplete(qc)) {
      emitPetEvent({ type: "research-progress", growth: "figures_done" })
    }
  }

  const runDesign = async (mode: "design" | "audit") => {
    if (!chatSettings) {
      toast.error(t("research.figures.toastNeedModel"))
      return
    }
    const claimText = (active?.claim || claim).trim()
    if (!claimText) {
      toast.error(t("research.figures.toastNeedClaim"))
      return
    }
    const deliv = active?.deliverable || deliverable
    // AI pixels never go through the chat model —use runAiImage instead.
    if (deliv === "ai_image") {
      toast.message(t("research.figures.toastUseImageApi"))
      return
    }
    const dataText = (dataPayload || active?.dataPayload || "").trim()
    if (deliv === "render" && !dataText && !hasExperimentResults) {
      toast.error(t("research.figures.toastNeedData"))
      return
    }

    setFiguresLoading(true)
    setFiguresError(null)
    try {
      const provider = resolveModelProvider(
        chatSettings.model,
        models,
        availableHostedModels,
        availableLocalModels,
        availableOpenRouterModels
      )
      const res = await fetch("/api/figures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          deliverable: deliv,
          type: active?.type || type,
          claim: claimText,
          userNotes: userNotes || active?.layoutNotes || undefined,
          dataPayload: dataText || undefined,
          codeLanguage:
            deliv === "code" ? codeLanguage : active?.codeLanguage || undefined,
          existing: active
            ? { ...active, dataPayload: dataText || active.dataPayload }
            : undefined,
          ideaCard: ideaCard || undefined,
          experimentRecord: experimentRecord || undefined,
          writingExcerpt: writingSession?.current?.content?.slice(0, 4000),
          chatSettings,
          provider: provider.provider,
          customModelId: provider.customModelId,
          locale
        })
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(data.message || t("research.figures.toastFail"))
      const figure = data.figure as FigureSpec
      setFigureSession(prev =>
        upsertFigure(prev || emptyFigureSession(), figure)
      )
      setType(figure.type)
      setClaim(figure.claim)
      setDeliverable(figure.deliverable || deliv)
      if (figure.dataPayload) setDataPayload(figure.dataPayload)
      if (figure.codeLanguage) setCodeLanguage(figure.codeLanguage)
      if (figure.promptArtifact) setPromptDraft(figure.promptArtifact)
      toast.success(t("research.figures.toastDone"))
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : t("research.figures.toastFail")
      setFiguresError(msg)
      toast.error(msg)
    } finally {
      setFiguresLoading(false)
    }
  }

  /** Polish prompt with chat model only —does not call the image API. */
  const polishImagePrompt = async () => {
    if (!chatSettings) {
      toast.error(t("research.figures.toastNeedModel"))
      return
    }
    const claimText = (active?.claim || claim).trim()
    if (!claimText) {
      toast.error(t("research.figures.toastNeedClaim"))
      return
    }
    setFiguresLoading(true)
    setFiguresError(null)
    try {
      const provider = resolveModelProvider(
        chatSettings.model,
        models,
        availableHostedModels,
        availableLocalModels,
        availableOpenRouterModels
      )
      const res = await fetch("/api/figures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "design",
          deliverable: "ai_image",
          type: active?.type || type,
          claim: claimText,
          userNotes: userNotes || undefined,
          existing: active || undefined,
          ideaCard: ideaCard || undefined,
          experimentRecord: experimentRecord || undefined,
          chatSettings,
          provider: provider.provider,
          customModelId: provider.customModelId,
          locale
        })
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(data.message || t("research.figures.toastFail"))
      const figure = data.figure as FigureSpec
      const merged = emptyFigureSpec(
        locale as "en" | "zh",
        {
          ...figure,
          deliverable: "ai_image",
          imageUrl: active?.imageUrl,
          imageMime: active?.imageMime,
          id: active?.id || figure.id
        },
        { hasExperimentResults }
      )
      setFigureSession(prev =>
        upsertFigure(prev || emptyFigureSession(), merged)
      )
      if (merged.promptArtifact) setPromptDraft(merged.promptArtifact)
      toast.success(t("research.figures.toastPromptPolished"))
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : t("research.figures.toastFail")
      setFiguresError(msg)
      toast.error(msg)
    } finally {
      setFiguresLoading(false)
    }
  }

  /** Generate pixels via dedicated image API —never the chat provider. */
  const runAiImage = async () => {
    if (!imageConfigured) {
      toast.error(t("research.figures.toastNeedImageApi"))
      return
    }
    const claimText = (active?.claim || claim).trim()
    const prompt = (
      promptDraft ||
      active?.promptArtifact ||
      [claimText, userNotes].filter(Boolean).join("\n")
    ).trim()
    if (prompt.length < 8) {
      toast.error(t("research.figures.toastNeedClaim"))
      return
    }

    setImageLoading(true)
    setFiguresError(null)
    try {
      const res = await fetch("/api/figures/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageGen,
          locale
        })
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(data.message || t("research.figures.toastImageFail"))

      const persisted = await persistSessionFigureImage(
        data.imageUrl,
        data.imageMime,
        active?.imageUrl
      )
      const base = active
        ? { ...active }
        : emptyFigureSpec(locale as "en" | "zh", {
            type,
            claim: claimText,
            deliverable: "ai_image",
            promptArtifact: prompt
          })
      const next = emptyFigureSpec(
        locale as "en" | "zh",
        {
          ...base,
          claim: claimText || base.claim,
          deliverable: "ai_image",
          promptArtifact: prompt,
          layoutNotes:
            base.layoutNotes ||
            (locale === "zh"
              ? "图片由专用生图 API 生成（未使用对话模型）。"
              : "Image produced by dedicated image API (chat model not used)."),
          imageUrl: persisted.imageUrl,
          imageMime: persisted.imageMime,
          id: base.id
        },
        { hasExperimentResults }
      )
      setFigureSession(prev =>
        upsertFigure(prev || emptyFigureSession(), next)
      )
      setDeliverable("ai_image")
      setClaim(next.claim)
      toast.success(t("research.figures.toastImageDone"))
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : t("research.figures.toastImageFail")
      setFiguresError(msg)
      toast.error(msg)
    } finally {
      setImageLoading(false)
    }
  }

  const addBlank = () => {
    const fig = emptyFigureSpec(locale as "en" | "zh", {
      type,
      claim: claim.trim(),
      qc: emptyQc()
    })
    setFigureSession(prev => upsertFigure(prev || emptyFigureSession(), fig))
    setClaim(fig.claim)
    toast.success(t("research.figures.toastAdded"))
  }

  const removeActive = () => {
    if (!active) return
    // Do not delete IndexedDB blob here —archive may still reference idb:…    // Orphans are GC'd on the next archive update via updateArchive.
    setFigureSession(prev => {
      const base = prev || emptyFigureSession()
      const figuresNext = base.figures.filter(f => f.id !== active.id)
      return {
        version: 1,
        figures: figuresNext,
        activeId: figuresNext[0]?.id || null
      }
    })
    toast.success(t("research.figures.toastRemoved"))
  }

  const exportMd = async () => {
    const session = figureSession || emptyFigureSession()
    if (!session.figures.length) {
      toast.error(t("research.figures.toastNothingToExport"))
      return
    }
    const md =
      session.figures.length === 1 && active
        ? figureToMarkdown(active)
        : figuresSessionToMarkdown(session)
    const ok = await exportTextArtifact({
      filename: stampFilename("figures", "md"),
      content: md,
      mime: "text/markdown;charset=utf-8"
    })
    toast.success(
      ok
        ? t("research.figures.toastExport")
        : t("research.figures.toastExportDownload")
    )
  }

  const exportJson = async () => {
    const session = figureSession || emptyFigureSession()
    if (!session.figures.length) {
      toast.error(t("research.figures.toastNothingToExport"))
      return
    }
    const ok = await exportTextArtifact({
      filename: stampFilename("figures", "json"),
      content: JSON.stringify(session, null, 2),
      mime: "application/json"
    })
    toast.success(
      ok
        ? t("research.figures.toastExportJson")
        : t("research.figures.toastExportDownload")
    )
  }

  const importIdeaClaim = () => {
    if (!ideaCard?.oneLiner && !ideaCard?.title) {
      toast.error(t("research.figures.toastNoIdea"))
      return
    }
    const next = ideaCard.oneLiner || ideaCard.title
    setClaim(next)
    if (active) patchActive({ claim: next })
    toast.success(t("research.figures.toastIdeaImported"))
  }

  const importExpData = () => {
    const tables = (experimentRecord?.resultTables || [])
      .map(x => String(x || "").trim())
      .filter(Boolean)
    if (!tables.length) {
      toast.error(t("research.figures.toastNoExpData"))
      return
    }
    const next = tables.join("\n\n")
    setDataPayload(next)
    if (active) patchActive({ dataPayload: next })
    toast.success(t("research.figures.toastExpDataImported"))
  }

  const copyText = async (text: string, okKey: string) => {
    if (!text.trim()) return
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t(okKey))
    } catch {
      toast.error("Copy failed")
    }
  }

  const activeDeliverable = active?.deliverable || deliverable

  return (
    <ModulePageShell>
      <ModulePageHeader
        moduleId="figures"
        badge={
          <div
            className={`mb-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badge}`}
          >
            <IconChartBar size={12} />
            {t("research.figures.badge")}
          </div>
        }
        title={t("research.figures.title")}
        subtitle={t("research.figures.subtitle")}
        actions={
          <>
            {active ? (
              <button
                type="button"
                onClick={removeActive}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300/80 bg-white/80 px-3 py-2 text-xs font-medium text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
              >
                <IconTrash size={14} />
                {t("research.figures.remove")}
              </button>
            ) : null}
            <ModuleExportActions
              onExportMd={exportMd}
              onExportJson={exportJson}
              disabled={!figures.length}
            />
          </>
        }
      />

      {/* Figure list */}
      {figures.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {figures.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => selectFigure(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active?.id === f.id
                  ? "bg-pink-800 text-white dark:bg-pink-400 dark:text-stone-950"
                  : "border border-stone-200 bg-white text-stone-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55"
              }`}
            >
              {t(`research.figures.types.${f.type}`)}
              {f.claim ? ` · ${f.claim.slice(0, 24)}` : ""}
            </button>
          ))}
        </div>
      ) : null}

      {/* Design controls */}
      <div className="mt-5 space-y-3 rounded-3xl border border-stone-200/90 bg-white/90 p-4 dark:border-white/[0.08] dark:bg-[#12151a]/90">
        <div className="flex flex-wrap gap-1.5">
          {FIGURE_TYPES.map(ft => (
            <button
              key={ft}
              type="button"
              onClick={() => {
                setType(ft)
                if (active) patchActive({ type: ft })
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                (active?.type || type) === ft
                  ? "bg-pink-800 text-white dark:bg-pink-400 dark:text-stone-950"
                  : "border border-stone-200 bg-white text-stone-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55"
              }`}
            >
              {t(`research.figures.types.${ft}`)}
            </button>
          ))}
        </div>

        <div>
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            {t("research.figures.deliverableLabel")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {FIGURE_DELIVERABLES.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDeliverable(d)
                  if (active) patchActive({ deliverable: d })
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  activeDeliverable === d
                    ? "bg-stone-900 text-white dark:bg-white dark:text-stone-950"
                    : "border border-stone-200 bg-white text-stone-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55"
                }`}
              >
                {t(`research.figures.deliverables.${d}`)}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-stone-400">
            {t(`research.figures.deliverableHints.${activeDeliverable}`)}
          </p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            {t("research.figures.claimLabel")}
          </span>
          <textarea
            value={active ? active.claim : claim}
            onChange={e => {
              setClaim(e.target.value)
              if (active) patchActive({ claim: e.target.value })
            }}
            rows={2}
            placeholder={t("research.figures.claimPlaceholder")}
            className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-700/20 dark:border-white/10 dark:bg-black/20 dark:text-white/90"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            {t("research.figures.notesLabel")}
          </span>
          <textarea
            value={userNotes}
            onChange={e => setUserNotes(e.target.value)}
            rows={2}
            placeholder={t("research.figures.notesPlaceholder")}
            className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-700/20 dark:border-white/10 dark:bg-black/20 dark:text-white/90"
          />
        </label>

        {activeDeliverable === "ai_image" ? (
          <div className="space-y-3 rounded-2xl border border-pink-500/25 bg-pink-500/[0.04] p-3">
            <div className="text-[11px] font-semibold text-pink-900 dark:text-pink-200">
              {t("research.figures.imageApiTitle")}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-white/45">
              {t("research.figures.imageApiHint")}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-[11px] text-stone-600 dark:text-white/55">
                Base URL
                <input
                  value={imageGen.baseUrl}
                  onChange={e =>
                    persistImageGen({ ...imageGen, baseUrl: e.target.value })
                  }
                  placeholder="https://api.openai.com/v1"
                  className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs dark:border-white/10 dark:bg-black/20"
                />
              </label>
              <label className="block text-[11px] text-stone-600 dark:text-white/55">
                Model
                <input
                  value={imageGen.model}
                  onChange={e =>
                    persistImageGen({ ...imageGen, model: e.target.value })
                  }
                  placeholder="dall-e-3"
                  className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs dark:border-white/10 dark:bg-black/20"
                />
              </label>
              <label className="block text-[11px] text-stone-600 dark:text-white/55 sm:col-span-2">
                API Key
                <input
                  type="password"
                  value={imageGen.apiKey}
                  onChange={e =>
                    persistImageGen({ ...imageGen, apiKey: e.target.value })
                  }
                  placeholder="sk-…"
                  className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs dark:border-white/10 dark:bg-black/20"
                  autoComplete="off"
                />
              </label>
              <label className="block text-[11px] text-stone-600 dark:text-white/55">
                Size
                <select
                  value={imageGen.size}
                  onChange={e =>
                    persistImageGen({ ...imageGen, size: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs dark:border-white/10 dark:bg-black/20"
                >
                  <option value="1024x1024">1024×1024</option>
                  <option value="1792x1024">1792×1024</option>
                  <option value="1024x1792">1024×1792</option>
                </select>
              </label>
              <div className="flex items-end text-[11px]">
                <span
                  className={
                    imageConfigured
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-amber-800 dark:text-amber-200"
                  }
                >
                  {imageConfigured
                    ? t("research.figures.imageApiReady")
                    : t("research.figures.imageApiMissing")}
                </span>
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                {t("research.figures.imagePromptLabel")}
              </span>
              <textarea
                value={promptDraft || active?.promptArtifact || ""}
                onChange={e => {
                  setPromptDraft(e.target.value)
                  if (active) patchActive({ promptArtifact: e.target.value })
                }}
                rows={4}
                placeholder={t("research.figures.imagePromptPlaceholder")}
                className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-black/20 dark:text-white/90"
              />
            </label>
          </div>
        ) : null}

        {activeDeliverable === "render" || activeDeliverable === "code" ? (
          <label className="block">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                {t("research.figures.dataLabel")}
              </span>
              <button
                type="button"
                onClick={importExpData}
                className="text-[10px] font-medium text-pink-700 dark:text-pink-300"
              >
                {t("research.figures.importExpData")}
              </button>
            </div>
            <textarea
              value={dataPayload}
              onChange={e => {
                setDataPayload(e.target.value)
                if (active) patchActive({ dataPayload: e.target.value })
              }}
              rows={5}
              placeholder={t("research.figures.dataPlaceholder")}
              className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 font-mono text-[12px] outline-none focus:ring-2 focus:ring-pink-700/20 dark:border-white/10 dark:bg-black/20 dark:text-white/90"
            />
          </label>
        ) : null}

        {activeDeliverable === "code" ? (
          <label className="inline-flex items-center gap-1.5 text-xs text-stone-600 dark:text-white/55">
            {t("research.figures.codeLanguage")}
            <select
              value={codeLanguage}
              onChange={e => {
                setCodeLanguage(e.target.value)
                if (active) patchActive({ codeLanguage: e.target.value })
              }}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-black/20"
            >
              <option value="python">Python / matplotlib</option>
              <option value="plotly">Plotly</option>
              <option value="seaborn">Seaborn</option>
              <option value="tikz">TikZ</option>
              <option value="drawio">draw.io XML</option>
            </select>
          </label>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={importIdeaClaim}
              className="rounded-xl border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 dark:border-white/15 dark:text-white/70"
            >
              {t("research.figures.importIdea")}
            </button>
            <button
              type="button"
              onClick={addBlank}
              className="inline-flex items-center gap-1 rounded-xl border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 dark:border-white/15 dark:text-white/70"
            >
              <IconPlus size={14} />
              {t("research.figures.addBlank")}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeDeliverable === "ai_image" ? (
              <>
                <button
                  type="button"
                  disabled={figuresLoading}
                  onClick={polishImagePrompt}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-pink-300 px-4 text-sm font-medium text-pink-900 disabled:opacity-50 dark:border-pink-400/40 dark:text-pink-200"
                >
                  {figuresLoading ? (
                    <IconLoader2 size={16} className="animate-spin" />
                  ) : null}
                  {t("research.figures.polishPrompt")}
                </button>
                <button
                  type="button"
                  disabled={imageLoading || !imageConfigured}
                  onClick={runAiImage}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-pink-800 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-pink-400 dark:text-stone-950"
                >
                  {imageLoading ? (
                    <IconLoader2 size={16} className="animate-spin" />
                  ) : (
                    <IconSparkles size={16} />
                  )}
                  {imageLoading
                    ? t("research.figures.imageRunning")
                    : t("research.figures.generateImage")}
                </button>
              </>
            ) : (
              <>
                {active?.layoutNotes ? (
                  <button
                    type="button"
                    disabled={figuresLoading}
                    onClick={() => runDesign("audit")}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-pink-300 px-4 text-sm font-medium text-pink-900 disabled:opacity-50 dark:border-pink-400/40 dark:text-pink-200"
                  >
                    {figuresLoading ? (
                      <IconLoader2 size={16} className="animate-spin" />
                    ) : null}
                    {t("research.figures.audit")}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={figuresLoading}
                  onClick={() => runDesign("design")}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-pink-800 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-pink-400 dark:text-stone-950"
                >
                  {figuresLoading ? (
                    <IconLoader2 size={16} className="animate-spin" />
                  ) : (
                    <IconSparkles size={16} />
                  )}
                  {figuresLoading
                    ? t("research.figures.running")
                    : t("research.figures.generate")}
                </button>
              </>
            )}
          </div>
        </div>
        {!hasExperimentResults ? (
          <p className="text-[11px] text-stone-400">
            {t("research.figures.noResultsHint")}
          </p>
        ) : null}
      </div>

      {figuresError ? (
        <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {figuresError}
        </div>
      ) : null}

      {!active && !figuresLoading ? (
        <div className="mx-auto mt-10 max-w-lg py-10 text-center text-sm text-stone-500 dark:text-white/40">
          {t("research.figures.emptyHint")}
        </div>
      ) : null}

      {active ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {activeImageSrc ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <h2 className="mb-3 text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.figures.aiImageTitle")}
                </h2>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeImageSrc}
                  alt={active.claim || "AI figure"}
                  className="mx-auto max-h-[480px] w-auto max-w-full rounded-xl border border-stone-100 dark:border-white/10"
                />
                <p className="mt-2 text-center text-[10px] text-stone-400">
                  {t("research.figures.aiImageCaption")}
                </p>
              </div>
            ) : activeImageStatus === "loading" ? (
              <div className="rounded-[1.35rem] border border-dashed border-stone-200/90 bg-stone-50/80 p-4 text-center text-xs text-stone-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/45">
                {t("research.figures.aiImageLoading")}
              </div>
            ) : activeImageStatus === "missing" ? (
              <div className="rounded-[1.35rem] border border-dashed border-amber-500/30 bg-amber-500/5 p-4 text-center text-xs text-amber-800 dark:text-amber-200">
                {t("research.figures.aiImageMissing")}
              </div>
            ) : null}

            {active.chartSpec?.rows?.length ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <h2 className="mb-3 text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.figures.previewTitle")}
                </h2>
                <FigureChartPreview spec={active.chartSpec} />
              </div>
            ) : null}

            {active.codeArtifact ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
                    {t("research.figures.codeTitle")}
                    {active.codeLanguage ? (
                      <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-stone-400">
                        {active.codeLanguage}
                      </span>
                    ) : null}
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        active.codeArtifact || "",
                        "research.figures.toastCopiedCode"
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-[11px] dark:border-white/10"
                  >
                    <IconCopy size={12} />
                    {t("research.figures.copy")}
                  </button>
                </div>
                <pre className="max-h-96 overflow-auto rounded-2xl border border-stone-100 bg-[#fafaf8] p-3 text-[11px] leading-5 dark:border-white/[0.06] dark:bg-black/30 dark:text-white/80">
                  <code>{active.codeArtifact}</code>
                </pre>
              </div>
            ) : null}

            {active.promptArtifact ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
                    {t("research.figures.promptTitle")}
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        active.promptArtifact || "",
                        "research.figures.toastCopiedPrompt"
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-[11px] dark:border-white/10"
                  >
                    <IconCopy size={12} />
                    {t("research.figures.copy")}
                  </button>
                </div>
                <textarea
                  value={active.promptArtifact}
                  onChange={e =>
                    patchActive({ promptArtifact: e.target.value })
                  }
                  rows={8}
                  className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-black/20 dark:text-white/90"
                />
              </div>
            ) : null}

            <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.figures.layoutTitle")}
                </h2>
                <span className="text-[10px] uppercase tracking-wide text-stone-400">
                  {active.paradigm || active.tool
                    ? [active.paradigm, active.tool].filter(Boolean).join(" · ")
                    : active.type}
                </span>
              </div>
              <textarea
                value={active.layoutNotes}
                onChange={e => patchActive({ layoutNotes: e.target.value })}
                rows={12}
                className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 font-serif text-[14px] leading-7 outline-none focus:ring-2 focus:ring-pink-700/20 dark:border-white/10 dark:bg-black/20 dark:text-white/90"
              />
            </div>

            {active.panelPlan ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <h2 className="mb-2 text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.figures.panelsTitle")}
                </h2>
                <textarea
                  value={active.panelPlan}
                  onChange={e => patchActive({ panelPlan: e.target.value })}
                  rows={4}
                  className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-black/20 dark:text-white/90"
                />
              </div>
            ) : null}

            {active.captionDraft ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <h2 className="mb-2 text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.figures.captionTitle")}
                </h2>
                <textarea
                  value={active.captionDraft}
                  onChange={e => patchActive({ captionDraft: e.target.value })}
                  rows={4}
                  className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-black/20 dark:text-white/90"
                />
              </div>
            ) : null}

            {active.paletteNotes ? (
              <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
                <h2 className="mb-2 text-sm font-semibold text-stone-800 dark:text-white/85">
                  {t("research.figures.paletteTitle")}
                </h2>
                <textarea
                  value={active.paletteNotes}
                  onChange={e => patchActive({ paletteNotes: e.target.value })}
                  rows={3}
                  className="w-full resize-y rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-black/20 dark:text-white/90"
                />
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
              <h2 className="mb-1 text-sm font-semibold text-stone-800 dark:text-white/85">
                {t("research.figures.qcTitle")}
              </h2>
              <p className="mb-3 text-[11px] text-stone-400">
                {t("research.figures.qcHint", {
                  passed: qcPassedCount(active.qc),
                  total: FIGURE_QC_KEYS.length
                })}
              </p>
              <ul className="space-y-1.5">
                {FIGURE_QC_KEYS.map(key => (
                  <li key={key}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-100 px-2.5 py-1.5 text-[11px] dark:border-white/[0.05]">
                      <input
                        type="checkbox"
                        checked={active.qc[key]}
                        onChange={() => toggleQc(key)}
                        className="mt-0.5"
                      />
                      <span className="text-stone-700 dark:text-white/70">
                        {t(`research.figures.qc.${key}`)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[1.35rem] border border-stone-200/90 bg-white p-4 dark:border-white/[0.07] dark:bg-[#12151a]">
              <h2 className="mb-2 text-sm font-semibold text-stone-800 dark:text-white/85">
                {t("research.figures.gatesTitle")}
              </h2>
              <ul className="space-y-1.5">
                {active.gates.map((g, i) => (
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
          </aside>
        </div>
      ) : null}
    </ModulePageShell>
  )
}
