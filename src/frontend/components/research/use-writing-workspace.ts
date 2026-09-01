"use client"

import { ChatbotUIContext } from "@/context/context"
import { CopilotContext } from "@/context/copilot-context"
import { resolveModelProvider } from "@/lib/copilot-generator"
import { emitPetEvent } from "@/lib/desktop-pet/events"
import { readResearchFileAsText } from "@/lib/research-uploads"
import {
  applyAcceptedDiffs,
  buildWritingGates,
  countProseUnits,
  emptyWritingSession,
  normalizeWordLimit,
  parseReviewComments,
  pushWritingSnapshot,
  resolveProseCountUnit,
  writingToMarkdown,
  type PublicationMode,
  type ReviewCommentItem,
  type StyleTier,
  type WritingBundle,
  type WritingMode
} from "@/lib/writing-types"
import {
  exportTextArtifact,
  stampFilename
} from "@/lib/research-export"
import { registerWritingProseFlush } from "@/lib/writing-prose-flush"
import {
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

export function useWritingWorkspace(
  defaultMode: WritingMode,
  options?: { apiPath?: string }
) {
  const apiPath = options?.apiPath || "/api/writing"
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith("zh") ? "zh" : "en"

  const {
    literatureReview,
    ideaCard,
    experimentRecord,
    writingSession,
    setWritingSession,
    writingLoading,
    setWritingLoading,
    writingError,
    setWritingError
  } = useContext(CopilotContext)

  const {
    chatSettings,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const writingBundle = writingSession?.current || null

  const [mode, setMode] = useState<WritingMode>(defaultMode)
  const [section, setSection] = useState<string>("introduction")
  const [publicationMode, setPublicationMode] =
    useState<PublicationMode>("draft")
  const [styleTier, setStyleTier] = useState<StyleTier>("academic")
  const [forceEnglish, setForceEnglish] = useState(false)
  const [wordLimit, setWordLimitState] = useState<number | null>(null)
  const [materials, setMaterials] = useState("")
  const [files, setFiles] = useState<{ name: string; text: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const proseRef = useRef<HTMLTextAreaElement>(null)

  const [localProse, setLocalProse] = useState("")
  const localProseRef = useRef("")
  const syncedBundleAt = useRef<string | null>(null)

  const [commentsRaw, setCommentsRaw] = useState("")
  const [comments, setComments] = useState<ReviewCommentItem[]>(
    () => writingSession?.comments || []
  )

  const [scopedTarget, setScopedTarget] = useState("")
  const [scopedInstruction, setScopedInstruction] = useState("")
  const [preserveClaims, setPreserveClaims] = useState(true)

  const [compareA, setCompareA] = useState<string>("")
  const [compareB, setCompareB] = useState<string>("")
  const [showCompare, setShowCompare] = useState(false)

  const resolveProvider = () =>
    resolveModelProvider(
      chatSettings!.model,
      models,
      availableHostedModels,
      availableLocalModels,
      availableOpenRouterModels
    )

  const hasExperimentResults = useMemo(() => {
    if (!experimentRecord) return false
    const logs = (experimentRecord.runLogs || []).some(x =>
      String(x || "").trim()
    )
    const tables = (experimentRecord.resultTables || []).some(x =>
      String(x || "").trim()
    )
    return logs || tables
  }, [experimentRecord])
  const hasExperimentResultsRef = useRef(hasExperimentResults)
  hasExperimentResultsRef.current = hasExperimentResults

  const composedMaterials = useMemo(() => {
    const parts = [materials.trim(), ...files.map(f => f.text)].filter(Boolean)
    return parts.join("\n\n---\n\n")
  }, [materials, files])

  const litHints = useMemo(() => {
    if (!literatureReview) return undefined
    return {
      topic: literatureReview.topic,
      gaps: literatureReview.review?.gaps || [],
      paperIds: (literatureReview.papers || []).map(p => p.id).filter(Boolean),
      abstracts: (literatureReview.papers || [])
        .map(p =>
          [p.id, p.title, p.brief || p.summary].filter(Boolean).join(" — ")
        )
        .filter(Boolean)
        .slice(0, 12)
    }
  }, [literatureReview])

  const history = writingSession?.history || []

  useEffect(() => {
    if (!writingBundle) {
      if (syncedBundleAt.current !== null) {
        syncedBundleAt.current = null
        localProseRef.current = ""
        setLocalProse("")
      }
      return
    }
    if (syncedBundleAt.current === writingBundle.createdAt) return
    syncedBundleAt.current = writingBundle.createdAt
    localProseRef.current = writingBundle.content
    setLocalProse(writingBundle.content)
    setWordLimitState(normalizeWordLimit(writingBundle.wordLimit))
  }, [writingBundle])

  // Flush local prose before Writing/Polish unmount (module switch / keep-alive teardown).
  useEffect(() => {
    return () => {
      const content = localProseRef.current
      if (!content.trim()) return
      setWritingSession(prev => {
        if (!prev?.current) return prev
        if (prev.current.content === content) return prev
        const next = {
          ...prev.current,
          content,
          gates: buildWritingGates(
            { ...prev.current, content },
            { hasExperimentResults: hasExperimentResultsRef.current }
          )
        }
        return { ...prev, current: next }
      })
    }
  }, [setWritingSession])

  useEffect(() => {
    if (writingSession?.comments) setComments(writingSession.comments)
  }, [writingSession?.comments])

  const proseUnit = useMemo(
    () => resolveProseCountUnit(locale as "en" | "zh", forceEnglish),
    [locale, forceEnglish]
  )

  const proseCount = useMemo(
    () => countProseUnits(localProse, proseUnit),
    [localProse, proseUnit]
  )

  const setWordLimit = useCallback(
    (raw: number | null) => {
      const lim = normalizeWordLimit(raw)
      setWordLimitState(lim)
      if (!writingBundle) return
      const content = localProseRef.current
      const next = {
        ...writingBundle,
        content,
        wordLimit: lim,
        gates: buildWritingGates(
          { ...writingBundle, content, wordLimit: lim },
          { hasExperimentResults }
        )
      }
      startTransition(() => {
        setWritingSession(prev => {
          const base = prev || emptyWritingSession()
          return { ...base, comments, current: next }
        })
      })
    },
    [writingBundle, comments, hasExperimentResults, setWritingSession]
  )

  const versionById = useCallback(
    (id: string): WritingBundle | null => {
      if (id === "current") {
        if (!writingBundle) return null
        return { ...writingBundle, content: localProseRef.current }
      }
      return history.find(h => h.id === id)?.bundle || null
    },
    [writingBundle, history]
  )

  const commitBundle = useCallback(
    (bundle: WritingBundle, opts?: { snapshot?: boolean; label?: string }) => {
      syncedBundleAt.current = bundle.createdAt
      localProseRef.current = bundle.content
      setLocalProse(bundle.content)
      startTransition(() => {
        setWritingSession(prev => {
          const base = prev || emptyWritingSession()
          const withComments = { ...base, comments }
          if (opts?.snapshot) {
            return pushWritingSnapshot(withComments, bundle, opts.label)
          }
          return { ...withComments, current: bundle }
        })
      })
    },
    [comments, setWritingSession]
  )

  const flushProseToSession = useCallback(() => {
    if (!writingBundle) return writingBundle
    const content = localProseRef.current
    if (content === writingBundle.content) return writingBundle
    const next = {
      ...writingBundle,
      content,
      gates: buildWritingGates(
        { ...writingBundle, content },
        { hasExperimentResults }
      )
    }
    setWritingSession(prev => {
      const base = prev || emptyWritingSession()
      return { ...base, comments, current: next }
    })
    return next
  }, [writingBundle, comments, hasExperimentResults, setWritingSession])

  // Let Archive / captureSnapshot pull latest editor prose even before blur.
  useEffect(() => {
    registerWritingProseFlush(() => flushProseToSession())
    return () => registerWritingProseFlush(null)
  }, [flushProseToSession])

  const seedDraftContent = (fileName: string, rawText: string) => {
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
      toast.error(
        locale === "zh"
          ? `无法从 ${fileName} 提取正文，请改用 .txt / .md / .docx`
          : `Could not extract text from ${fileName}; try .txt / .md / .docx`
      )
      return false
    }
    localProseRef.current = body
    setLocalProse(body)
    const bundle: WritingBundle = {
      version: 1,
      mode: "polish",
      content: body,
      publicationMode,
      styleTier,
      locale: locale as "en" | "zh",
      wordLimit,
      gates: buildWritingGates(
        {
          version: 1,
          mode: "polish",
          content: body,
          publicationMode,
          styleTier,
          locale: locale as "en" | "zh",
          wordLimit,
          gates: [],
          createdAt: new Date().toISOString()
        },
        { hasExperimentResults }
      ),
      createdAt: new Date().toISOString()
    }
    commitBundle(bundle, {
      snapshot: true,
      label:
        locale === "zh"
          ? `上传初稿 · ${fileName}`
          : `Uploaded draft · ${fileName}`
    })
    window.setTimeout(() => {
      toast.success(t("research.polish.toastSeeded"))
    }, 50)
    return true
  }

  const onPickFiles = async (
    list: FileList | null,
    opts?: { asDraft?: boolean }
  ) => {
    if (!list?.length) return
    const next: { name: string; text: string }[] = []
    for (const file of Array.from(list)) {
      next.push({ name: file.name, text: await readResearchFileAsText(file) })
    }
    setFiles(prev => [...prev, ...next])
    if (fileRef.current) fileRef.current.value = ""

    if (opts?.asDraft && next[0]) {
      const file = next[0]
      // Defer past the file-input event + toast portal settle.
      window.setTimeout(() => {
        seedDraftContent(file.name, file.text)
      }, 50)
    } else {
      toast.success(t("research.writing.toastFiles", { count: next.length }))
    }
  }

  /** Load first uploaded file body as the working draft (Polish empty state). */
  const seedDraftFromUpload = () => {
    const first = files[0]
    if (!first?.text?.trim()) {
      toast.error(t("research.polish.toastNeedUpload"))
      return
    }
    seedDraftContent(first.name, first.text)
  }

  const importContextBlurb = useCallback(() => {
    const chunks: string[] = []
    if (ideaCard) {
      chunks.push(
        locale === "zh"
          ? `【Idea】${ideaCard.title}\n${ideaCard.oneLiner}`
          : `[Idea] ${ideaCard.title}\n${ideaCard.oneLiner}`
      )
    }
    if (experimentRecord) {
      chunks.push(
        locale === "zh"
          ? `【实验】状态 ${experimentRecord.status}`
          : `[Experiment] status ${experimentRecord.status}`
      )
    }
    if (literatureReview?.topic) {
      chunks.push(
        locale === "zh"
          ? `【文献】主题 ${literatureReview.topic}`
          : `[Literature] topic ${literatureReview.topic}`
      )
    }
    if (!chunks.length) {
      toast.error(t("research.writing.toastNoImport"))
      return
    }
    setMaterials(prev =>
      prev.trim() ? `${prev.trim()}\n\n${chunks.join("\n\n")}` : chunks.join("\n\n")
    )
    toast.success(t("research.writing.toastImported"))
  }, [ideaCard, experimentRecord, literatureReview, locale, t])

  const parseComments = () => {
    const parsed = parseReviewComments(commentsRaw)
    if (!parsed.length) {
      toast.error(t("research.writing.toastNeedComments"))
      return
    }
    setComments(parsed)
    setWritingSession(prev => ({
      ...(prev || emptyWritingSession()),
      comments: parsed
    }))
    toast.success(
      t("research.writing.toastCommentsParsed", { count: parsed.length })
    )
  }

  const captureSelection = () => {
    const el = proseRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = (el.value || "").slice(start, end).trim()
    if (!selected) {
      toast.error(t("research.writing.toastNeedSelection"))
      return
    }
    setScopedTarget(selected)
    setMode("revise_scoped")
    toast.success(t("research.writing.toastSelectionCaptured"))
  }

  const saveSnapshot = () => {
    const latest = flushProseToSession()
    if (!latest) {
      toast.error(t("research.writing.toastNeedDraft"))
      return
    }
    commitBundle(latest, { snapshot: true })
    toast.success(t("research.writing.toastSnapshot"))
  }

  const restoreVersion = (id: string) => {
    const bundle = versionById(id)
    if (!bundle) return
    const latest = flushProseToSession()
    if (latest) {
      commitBundle(latest, {
        snapshot: true,
        label: locale === "zh" ? "恢复前自动存档" : "Auto-save before restore"
      })
    }
    commitBundle(
      { ...bundle, createdAt: new Date().toISOString() },
      {
        snapshot: true,
        label: locale === "zh" ? "已恢复版本" : "Restored version"
      }
    )
    toast.success(t("research.writing.toastRestored"))
  }

  const runGenerate = async () => {
    if (!chatSettings) {
      toast.error(t("research.writing.toastNeedModel"))
      return
    }

    const needsDraft =
      mode === "polish" ||
      mode === "revise_feedback" ||
      mode === "revise_scoped"
    const flushed = flushProseToSession()
    const draftText = flushed?.content || localProseRef.current || materials

    if (needsDraft && !draftText.trim()) {
      toast.error(t("research.writing.toastNeedDraft"))
      return
    }
    if (mode === "revise_feedback" && !comments.length) {
      toast.error(t("research.writing.toastNeedComments"))
      return
    }
    if (mode === "revise_scoped" && !scopedInstruction.trim()) {
      toast.error(t("research.writing.toastNeedInstruction"))
      return
    }
    if (
      !needsDraft &&
      !composedMaterials &&
      !ideaCard &&
      !experimentRecord &&
      !litHints?.topic
    ) {
      toast.error(t("research.writing.toastNeedSeed"))
      return
    }

    if (flushed && needsDraft) {
      commitBundle(flushed, {
        snapshot: true,
        label: locale === "zh" ? `改稿前 · ${mode}` : `Before ${mode}`
      })
    }

    setWritingLoading(true)
    setWritingError(null)
    try {
      const { provider, customModelId } = resolveProvider()
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          section:
            mode === "draft_section" || mode === "nature_style"
              ? section
              : undefined,
          publicationMode,
          styleTier,
          forceEnglish,
          wordLimit,
          userDraft: needsDraft
            ? draftText
            : flushed?.content || undefined,
          userMaterials: composedMaterials || undefined,
          reviewComments: mode === "revise_feedback" ? comments : undefined,
          scoped:
            mode === "revise_scoped" || mode === "polish"
              ? {
                  targetText:
                    mode === "revise_scoped"
                      ? scopedTarget || undefined
                      : undefined,
                  instruction:
                    mode === "revise_scoped"
                      ? scopedInstruction
                      : scopedInstruction || undefined,
                  preserveClaims:
                    mode === "revise_scoped" ? preserveClaims : undefined
                }
              : undefined,
          literatureHints: litHints,
          ideaCard: ideaCard || undefined,
          experimentRecord: experimentRecord || undefined,
          chatSettings,
          provider,
          customModelId,
          locale
        })
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(data.message || t("research.writing.toastFail"))
      const bundle = {
        ...(data.bundle as WritingBundle),
        wordLimit: wordLimit ?? (data.bundle as WritingBundle).wordLimit
      }
      commitBundle(bundle, {
        snapshot: true,
        label: `${mode} · ${new Date().toLocaleTimeString()}`
      })
      if (bundle.reviewResponses?.length) {
        setComments(bundle.reviewResponses)
      }
      if (data.warning) toast.message(data.warning)
      toast.success(t("research.writing.toastDone"))
    } catch (e: any) {
      const msg = e?.message || t("research.writing.toastFail")
      setWritingError(msg)
      toast.error(msg)
    } finally {
      setWritingLoading(false)
    }
  }

  const onProseChange = (content: string) => {
    localProseRef.current = content
    setLocalProse(content)
  }

  const setDiffAccepted = (index: number, accepted: boolean) => {
    const base = flushProseToSession()
    if (!base) return
    const diffs = [...(base.pendingSemanticDiffs || [])]
    if (!diffs[index]) return
    diffs[index] = { ...diffs[index], accepted }
    let content = base.content
    if (accepted) {
      content = applyAcceptedDiffs(base.content, [diffs[index]])
    }
    const next = { ...base, content, pendingSemanticDiffs: diffs }
    let reviewResponses = base.reviewResponses
    if (accepted && diffs[index].commentId && reviewResponses) {
      reviewResponses = reviewResponses.map(r =>
        r.id === diffs[index].commentId
          ? { ...r, status: "applied" as const }
          : r
      )
      setComments(reviewResponses)
    }
    commitBundle({
      ...next,
      reviewResponses,
      createdAt: new Date().toISOString(),
      gates: buildWritingGates(
        { ...next, reviewResponses },
        { hasExperimentResults }
      )
    })
    if (accepted) {
      emitPetEvent({ type: "research-progress", growth: "polish_done" })
    }
  }

  const exportPrefix =
    defaultMode === "polish" ||
    defaultMode === "revise_feedback" ||
    defaultMode === "revise_scoped"
      ? "polish"
      : "writing"

  const exportMarkdown = async () => {
    const latest = flushProseToSession()
    if (!latest) return
    const ok = await exportTextArtifact({
      filename: stampFilename(exportPrefix, "md"),
      content: writingToMarkdown(latest),
      mime: "text/markdown;charset=utf-8"
    })
    toast.success(
      ok
        ? t("research.writing.toastExport")
        : t("research.writing.toastExportDownload")
    )
    if (ok && exportPrefix === "writing") {
      emitPetEvent({ type: "research-progress", growth: "writing_done" })
    }
  }

  const exportJson = async () => {
    const latest = flushProseToSession()
    const payload = {
      ...(writingSession || emptyWritingSession()),
      current: latest,
      comments
    }
    const ok = await exportTextArtifact({
      filename: stampFilename(exportPrefix, "json"),
      content: JSON.stringify(payload, null, 2),
      mime: "application/json"
    })
    toast.success(
      ok
        ? t("research.writing.toastExportJson")
        : t("research.writing.toastExportDownload")
    )
    if (ok && exportPrefix === "writing") {
      emitPetEvent({ type: "research-progress", growth: "writing_done" })
    }
  }

  const seedDraftFromPaste = () => {
    const content = localProseRef.current.trim()
    if (!content) {
      toast.error(t("research.writing.toastNeedDraft"))
      return
    }
    window.setTimeout(() => {
      seedDraftContent(
        locale === "zh" ? "粘贴初稿" : "Pasted draft",
        content
      )
    }, 50)
  }

  const gateTone = (sev: string) => {
    if (sev === "BLOCK")
      return "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
    if (sev === "WARN")
      return "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
    if (sev === "CLEAR")
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
    return "border-stone-200 bg-stone-50 text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
  }

  return {
    t,
    locale,
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
    importContextBlurb,
    parseComments,
    captureSelection,
    saveSnapshot,
    restoreVersion,
    runGenerate,
    setDiffAccepted,
    exportMarkdown,
    exportJson,
    seedDraftFromPaste,
    seedDraftFromUpload,
    gateTone
  }
}
