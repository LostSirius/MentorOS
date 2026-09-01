"use client"

import { ChatbotUIContext } from "@/context/context"
import {
  CopilotContext,
  LiteraturePaper,
  LiteratureReviewResult
} from "@/context/copilot-context"
import { resolveModelProvider } from "@/lib/copilot-generator"
import { emitPetEvent } from "@/lib/desktop-pet/events"
import { detectDomains, expandBilingualQueries } from "@/lib/domain-lexicon"
import { moduleAccent } from "@/lib/research-module-accents"
import {
  exportTextArtifact,
  stampFilename
} from "@/lib/research-export"
import { RESEARCH_DOC_AND_IMAGE_ACCEPT } from "@/lib/research-uploads"
import {
  IconBook2,
  IconBrandGithub,
  IconExternalLink,
  IconFileUpload,
  IconLanguage,
  IconLoader2,
  IconNetwork,
  IconSearch,
  IconSparkles,
  IconTimeline,
  IconTrash,
  IconWorld,
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

type ViewTab = "lineage" | "review" | "papers" | "timeline"

const SOURCE_COLORS: Record<string, string> = {
  "Semantic Scholar": "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  OpenAlex: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Crossref: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  "Europe PMC": "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  PubMed: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  DOAJ: "bg-lime-600/15 text-lime-800 dark:text-lime-300",
  DBLP: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  arXiv: "bg-red-500/15 text-red-700 dark:text-red-300",
  "GitHub Search": "bg-stone-500/15 text-stone-600 dark:text-stone-300"
}

const SOURCE_SHORT: Record<string, string> = {
  "semantic-scholar": "S2",
  openalex: "OA",
  crossref: "CR",
  "europe-pmc": "PMC",
  pubmed: "PubMed",
  doaj: "DOAJ",
  dblp: "DBLP",
  arxiv: "arXiv"
}

function normalizeResult(
  raw: Partial<LiteratureReviewResult>,
  defaultTopic: string
): LiteratureReviewResult {
  const topic = raw.topic || defaultTopic
  const papers = Array.isArray(raw.papers) ? raw.papers : []
  const timeline = Array.isArray(raw.timeline) ? raw.timeline : []
  const review = raw.review || ({} as LiteratureReviewResult["review"])
  const lineage = raw.lineage || { narrative: "", threads: [] }

  return {
    topic,
    papers,
    review: {
      abstract: review.abstract || "",
      sections: Array.isArray(review.sections) ? review.sections : [],
      gaps: Array.isArray(review.gaps) ? review.gaps : [],
      futureDirections: Array.isArray(review.futureDirections)
        ? review.futureDirections
        : []
    },
    lineage: {
      narrative: lineage.narrative || "",
      threads: Array.isArray(lineage.threads) ? lineage.threads : []
    },
    timeline,
    references: Array.isArray(raw.references) ? raw.references : [],
    poster: raw.poster || {
      title: topic,
      subtitle: "",
      problem: "",
      methodEvolution: [],
      keyFindings: [],
      takeaway: ""
    },
    quality: raw.quality || {
      topicRelevanceEstimate: 0,
      codeCoverage: 0,
      limitations: []
    },
    evidence: raw.evidence,
    domains: raw.domains,
    queryPlan: raw.queryPlan
  }
}

const PaperRow: FC<{
  paper: LiteraturePaper
  index: number
  authorsUnknown: string
}> = ({ paper, index, authorsUnknown }) => (
  <article
    className="group relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4 transition hover:border-sky-600/30 dark:border-white/[0.07] dark:bg-[#12151a] dark:hover:border-sky-400/25"
  >
    <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-sky-500/[0.04] blur-2xl transition group-hover:bg-sky-500/[0.08]" />
    <div className="relative mb-2 flex flex-wrap items-center gap-1.5">
      <span className="rounded-md bg-stone-900 px-1.5 py-0.5 font-mono text-[10px] text-white dark:bg-white/15">
        {paper.id}
      </span>
      <span className="text-[11px] tabular-nums text-stone-500 dark:text-white/55">
        {paper.year}
      </span>
      {paper.venue ? (
        <span className="max-w-[160px] truncate rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500 dark:bg-white/10 dark:text-white/55">
          {paper.venue}
        </span>
      ) : null}
      {typeof paper.citationCount === "number" ? (
        <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
          cited {paper.citationCount}
        </span>
      ) : null}
      {(paper.sources || []).map(s => (
        <span
          key={s}
          className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-stone-500 dark:bg-white/10 dark:text-white/55"
        >
          {SOURCE_SHORT[s] || s}
        </span>
      ))}
    </div>
    <a
      href={paper.url}
      target="_blank"
      rel="noreferrer"
      className="relative text-[13px] font-semibold leading-snug text-stone-900 hover:text-sky-800 dark:text-white dark:hover:text-sky-300"
    >
      {paper.title}
      <IconExternalLink size={11} className="ml-1 inline opacity-40 dark:opacity-70" />
    </a>
    <p className="relative mt-1 text-[11px] text-stone-500 dark:text-white/60">
      {paper.authors?.slice(0, 4).join(", ") || authorsUnknown}
      {(paper.authors?.length || 0) > 4 ? " et al." : ""}
    </p>
    <p className="relative mt-2 text-[12px] leading-relaxed text-stone-600 dark:text-white/70">
      {paper.brief || paper.summary}
    </p>
    <div className="relative mt-3 flex flex-wrap gap-1.5">
      {paper.method ? (
        <span className="rounded-full border border-stone-200 px-2 py-0.5 text-[10px] text-stone-500 dark:border-white/15 dark:text-white/55">
          {paper.method}
        </span>
      ) : null}
      {paper.code ? (
        <a
          href={paper.code.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full bg-stone-900 px-2 py-0.5 text-[10px] text-white dark:bg-white/15"
        >
          <IconBrandGithub size={11} />
          Code
        </a>
      ) : null}
    </div>
  </article>
)

export const LiteratureResearchPage: FC = () => {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language || "en").startsWith("zh") ? "zh" : "en"
  const isZh = locale === "zh"
  const accent = moduleAccent("literature")

  const {
    literatureReview,
    setLiteratureReview,
    literatureReviewLoading,
    setLiteratureReviewLoading,
    literatureReviewError,
    setLiteratureReviewError
  } = useContext(CopilotContext)

  const {
    chatSettings,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const [topic, setTopic] = useState("")
  const [notes, setNotes] = useState("")
  const [maxPapers, setMaxPapers] = useState(18)
  const [customPapersInput, setCustomPapersInput] = useState("")
  const [files, setFiles] = useState<{ name: string; text: string }[]>([])
  const [view, setView] = useState<ViewTab>("lineage")
  const fileRef = useRef<HTMLInputElement>(null)

  const PAPER_COUNT_MIN = 8
  const PAPER_COUNT_MAX = 50
  const paperCountOptions = [12, 18, 24]
  const isCustomPaperCount = !paperCountOptions.includes(maxPapers)

  const clampPaperCount = (n: number) =>
    Math.min(PAPER_COUNT_MAX, Math.max(PAPER_COUNT_MIN, Math.round(n)))

  const applyCustomPaperCount = (raw: string) => {
    setCustomPapersInput(raw)
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed)) return
    setMaxPapers(clampPaperCount(parsed))
  }

  const liveDomains = useMemo(() => detectDomains(topic), [topic])
  const livePlan = useMemo(
    () => (topic.trim() ? expandBilingualQueries(topic) : null),
    [topic]
  )

  const result = useMemo(
    () =>
      literatureReview
        ? normalizeResult(
            literatureReview,
            t("research.literature.defaultTopic")
          )
        : null,
    [literatureReview, t]
  )

  const sourceBadges = useMemo(() => {
    const raw = result?.evidence?.source || ""
    return raw
      .split("+")
      .map(s => s.trim())
      .filter(Boolean)
  }, [result])

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
        return t("research.literature.imageNote", { name: file.name })
      }
      if (name.endsWith(".pdf") || name.endsWith(".docx")) {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch("/api/extract-text", {
          method: "POST",
          body: form
        })
        if (!res.ok)
          return t("research.literature.fileFail", { name: file.name })
        const data = await res.json()
        return data.text || t("research.literature.fileOk", { name: file.name })
      }
      return t("research.literature.attachment", { name: file.name })
    },
    [t]
  )

  const onPickFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return
      const next: { name: string; text: string }[] = []
      for (const file of Array.from(list)) {
        const text = await extractFileText(file)
        next.push({ name: file.name, text: text.slice(0, 12000) })
      }
      setFiles(prev => [...prev, ...next])
      toast.success(t("research.literature.toastFiles", { count: next.length }))
    },
    [extractFileText, t]
  )

  const runResearch = async () => {
    const query = topic.trim()
    if (!query) {
      toast.error(t("research.literature.toastNeedTopic"))
      return
    }
    if (!chatSettings) {
      toast.error(t("research.literature.toastNeedModel"))
      return
    }

    setLiteratureReviewLoading(true)
    setLiteratureReviewError(null)

    const { provider, customModelId } = resolveModelProvider(
      chatSettings.model,
      models,
      availableHostedModels,
      availableLocalModels,
      availableOpenRouterModels
    )

    const contextNotes = [
      notes.trim(),
      ...files.map(f => `--- File: ${f.name} ---\n${f.text}`)
    ]
      .filter(Boolean)
      .join("\n\n")

    try {
      const res = await fetch("/api/literature-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: query,
          maxPapers: clampPaperCount(maxPapers),
          chatSettings,
          provider,
          customModelId,
          contextNotes,
          locale
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setLiteratureReview(
        normalizeResult(data, t("research.literature.defaultTopic"))
      )
      setView("lineage")
      toast.success(t("research.literature.toastDone"))
    } catch (e: any) {
      const msg = e.message || t("research.literature.toastFail")
      setLiteratureReviewError(msg)
      toast.error(msg)
    } finally {
      setLiteratureReviewLoading(false)
    }
  }

  const exportMarkdown = async () => {
    if (!result) return
    const md = [
      `# ${t("research.literature.exportTitle", { topic: result.topic })}`,
      "",
      t("research.literature.exportSources", {
        sources: result.evidence?.source || ""
      }),
      "",
      `## ${t("research.literature.exportDomain")}`,
      ...(result.domains || []).map(d =>
        isZh
          ? `- ${d.labelZh} / ${d.labelEn}`
          : `- ${d.labelEn} / ${d.labelZh}`
      ),
      result.queryPlan?.backgroundZh
        ? `- ${t("research.literature.exportBackground", {
            zh: result.queryPlan.backgroundZh,
            en: result.queryPlan.backgroundEn || ""
          })}`
        : "",
      t("research.literature.exportPrimary", {
        query: result.queryPlan?.primaryEn || ""
      }),
      "",
      `## ${t("research.literature.exportLineage")}`,
      result.lineage?.narrative || "",
      "",
      ...(result.lineage?.threads || []).flatMap(th => [
        `### ${th.name}`,
        th.description,
        t("research.literature.exportPapersOf", {
          ids: (th.paperIds || []).join(", ")
        }),
        ""
      ]),
      `## ${t("research.literature.exportAbstract")}`,
      result.review.abstract,
      "",
      ...result.review.sections.flatMap(s => [`### ${s.heading}`, s.content, ""]),
      `## ${t("research.literature.exportBriefs")}`,
      ...result.papers.map(
        p =>
          `- **[${p.id}] ${p.title}** (${p.year}) — ${p.brief || p.summary}\n  ${p.url}`
      ),
      "",
      `## ${t("research.literature.exportRefs")}`,
      ...result.references.map(r => `- ${r}`)
    ].join("\n")
    const ok = await exportTextArtifact({
      filename: stampFilename("literature", "md"),
      content: md,
      mime: "text/markdown;charset=utf-8"
    })
    toast.success(
      ok
        ? t("research.literature.toastExport")
        : t("research.literature.toastExportDownload")
    )
    if (ok) {
      emitPetEvent({ type: "research-progress", growth: "literature_done" })
    }
  }

  const exportJson = async () => {
    if (!result) return
    const ok = await exportTextArtifact({
      filename: stampFilename("literature", "json"),
      content: JSON.stringify(result, null, 2),
      mime: "application/json"
    })
    toast.success(
      ok
        ? t("research.literature.toastExportJson")
        : t("research.literature.toastExportDownload")
    )
    if (ok) {
      emitPetEvent({ type: "research-progress", growth: "literature_done" })
    }
  }

  const tabs: { id: ViewTab; label: string; icon: typeof IconNetwork }[] = [
    {
      id: "lineage",
      label: t("research.literature.tabs.lineage"),
      icon: IconNetwork
    },
    {
      id: "review",
      label: t("research.literature.tabs.review"),
      icon: IconBook2
    },
    {
      id: "papers",
      label: t("research.literature.papersTabCount", {
        count: result?.papers?.length || 0
      }),
      icon: IconSparkles
    },
    {
      id: "timeline",
      label: t("research.literature.tabs.timeline"),
      icon: IconTimeline
    }
  ]

  const evidenceStats = result?.evidence?.stats

  const examples = [
    t("research.literature.examples.mmrag"),
    t("research.literature.examples.agents"),
    t("research.literature.examples.kgqa")
  ]

  return (
    <ModulePageShell>
      <ModulePageHeader
        moduleId="literature"
        badge={
          <div
            className={`mb-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badge}`}
          >
            <IconWorld size={12} />
            {t("research.literature.badge")}
          </div>
        }
        title={t("research.literature.title")}
        subtitle={t("research.literature.subtitle")}
        actions={
          <ModuleExportActions
            onExportMd={exportMarkdown}
            onExportJson={exportJson}
            disabled={!result}
          />
        }
      />

          <div className="mt-5 rounded-3xl border border-stone-200/90 bg-white/90 p-3 shadow-[0_1px_0_rgba(0,0,0,0.03)] backdrop-blur dark:border-white/[0.08] dark:bg-[#12151a]/90">
            <div className="space-y-2">
              <div className="relative">
                <IconSearch
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                      runResearch()
                  }}
                  placeholder={t("research.literature.topicPlaceholder")}
                  className="w-full rounded-2xl border border-stone-200 bg-[#fafaf8] py-3 pl-10 pr-4 text-sm outline-none ring-sky-700/30 placeholder:text-stone-400 focus:ring-2 dark:border-white/10 dark:bg-black/20 dark:text-white/90"
                />
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder={t("research.literature.notesPlaceholder")}
                className="w-full resize-none rounded-2xl border border-stone-200 bg-[#fafaf8] px-4 py-2.5 text-sm outline-none ring-sky-700/30 placeholder:text-stone-400 focus:ring-2 dark:border-white/10 dark:bg-black/20 dark:text-white/80"
              />
            </div>

            <div className="mt-2.5 flex flex-col gap-2.5 border-t border-stone-100 pt-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.05]">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                  {t("research.literature.paperCount")}
                </span>
                {paperCountOptions.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setMaxPapers(n)
                      setCustomPapersInput("")
                    }}
                    className={`min-w-[2.25rem] rounded-lg px-2 py-1 text-xs font-medium transition ${
                      maxPapers === n && !customPapersInput
                        ? "bg-stone-900 text-white dark:bg-sky-400 dark:text-stone-950"
                        : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 dark:border-white/10 dark:bg-white/5 dark:text-white/60"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <span
                  className={`text-[10px] ${
                    isCustomPaperCount || customPapersInput
                      ? "font-medium text-sky-800 dark:text-sky-300"
                      : "text-stone-400"
                  }`}
                >
                  {t("research.literature.paperCountCustom")}
                </span>
                <input
                  type="number"
                  min={PAPER_COUNT_MIN}
                  max={PAPER_COUNT_MAX}
                  value={
                    customPapersInput !== ""
                      ? customPapersInput
                      : isCustomPaperCount
                        ? String(maxPapers)
                        : ""
                  }
                  placeholder={t(
                    "research.literature.paperCountCustomPlaceholder"
                  )}
                  onChange={e => applyCustomPaperCount(e.target.value)}
                  onBlur={() => {
                    if (customPapersInput === "") return
                    const parsed = Number.parseInt(customPapersInput, 10)
                    if (!Number.isFinite(parsed)) {
                      setCustomPapersInput("")
                      return
                    }
                    const clamped = clampPaperCount(parsed)
                    setMaxPapers(clamped)
                    setCustomPapersInput(
                      paperCountOptions.includes(clamped) ? "" : String(clamped)
                    )
                  }}
                  className={`w-16 rounded-lg border px-2 py-1 text-xs outline-none ring-sky-700/30 focus:ring-2 dark:bg-black/30 dark:text-white/85 ${
                    isCustomPaperCount || customPapersInput
                      ? "border-sky-700/30 dark:border-sky-400/30"
                      : "border-stone-200 dark:border-white/10"
                  }`}
                />
                <span className="text-[10px] text-stone-400">
                  {t("research.literature.paperCountHint")}
                  {isCustomPaperCount || customPapersInput ? (
                    <span className="ml-1 font-medium text-sky-800 dark:text-sky-300">
                      →{maxPapers}
                    </span>
                  ) : null}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 px-3 text-xs text-stone-600 dark:border-white/15 dark:text-white/55"
                >
                  <IconFileUpload size={14} />
                  {t("research.literature.upload")}
                </button>
                <button
                  type="button"
                  disabled={literatureReviewLoading}
                  onClick={runResearch}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50 dark:bg-sky-400 dark:text-stone-950 dark:hover:bg-sky-300"
                >
                  {literatureReviewLoading ? (
                    <IconLoader2 size={15} className="animate-spin" />
                  ) : (
                    <IconSparkles size={15} />
                  )}
                  {literatureReviewLoading
                    ? t("research.literature.running")
                    : t("research.literature.run")}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept={RESEARCH_DOC_AND_IMAGE_ACCEPT}
                  className="hidden"
                  onChange={e => onPickFiles(e.target.files)}
                />
              </div>
            </div>

            {(liveDomains.length > 0 || livePlan) && topic.trim() && (
              <div className="mt-3 space-y-2 border-t border-stone-100 pt-3 dark:border-white/[0.05]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-stone-400">
                    <IconLanguage size={12} />
                    {t("research.literature.domainBackground")}
                  </span>
                  {liveDomains.length > 0 ? (
                    liveDomains.map(d => (
                      <span
                        key={d.id}
                        className="rounded-full bg-sky-700/10 px-2.5 py-1 text-[11px] text-sky-900 dark:bg-sky-400/10 dark:text-sky-200"
                        title={isZh ? d.labelEn : d.labelZh}
                      >
                        {isZh ? d.labelZh : d.labelEn}
                        <span className="ml-1 opacity-50">
                          / {isZh ? d.labelEn : d.labelZh}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-500 dark:bg-white/5 dark:text-white/45">
                      {(isZh
                        ? livePlan?.backgroundZh
                        : livePlan?.backgroundEn) ||
                        t("research.literature.generalDomain")}
                    </span>
                  )}
                </div>
                {livePlan?.primaryEn ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                      {t("research.literature.bilingualMap")}
                    </span>
                    <span className="max-w-full truncate rounded-lg border border-stone-200/80 bg-[#fafaf8] px-2.5 py-1 text-[11px] text-stone-600 dark:border-white/10 dark:bg-black/20 dark:text-white/55">
                      <span className="text-stone-400">
                        {t("research.literature.topicLabel")}
                      </span>{" "}
                      {topic.trim().slice(0, 48)}
                      {topic.trim().length > 48 ? "…" : ""}
                      <span className="mx-1.5 text-stone-300">→</span>
                      <span className="font-mono text-[10px] text-sky-800 dark:text-sky-300">
                        {livePlan.primaryEn}
                      </span>
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <span
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-0.5 text-[11px] text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-white/55"
                  >
                    {f.name}
                    <button
                      type="button"
                      onClick={() =>
                        setFiles(prev => prev.filter((_, j) => j !== i))
                      }
                    >
                      <IconX size={11} className="opacity-50" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="inline-flex items-center gap-1 text-[11px] text-stone-400"
                >
                  <IconTrash size={11} /> {t("research.literature.clearFiles")}
                </button>
              </div>
            )}
          </div>

        {literatureReviewError && (
          <div className="mb-4 mt-5 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {literatureReviewError}
          </div>
        )}

        {!result && !literatureReviewLoading && (
          <div className="mx-auto flex max-w-lg flex-col items-center py-16 text-center">
            <div className="mb-4 grid grid-cols-4 gap-2 opacity-80">
              {[
                "S2",
                "OA",
                "CR",
                "PMC",
                "PubMed",
                "DOAJ",
                "DBLP",
                "arXiv"
              ].map(s => (
                <span
                  key={s}
                  className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 font-mono text-[10px] text-stone-500 dark:border-white/10 dark:bg-white/5"
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-stone-500 dark:text-white/40">
              {t("research.literature.emptyHint")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {examples.map(example => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setTopic(example)}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] text-stone-600 transition hover:border-sky-600/30 hover:text-sky-800 dark:border-white/10 dark:bg-white/5 dark:text-white/50 dark:hover:text-sky-300"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {literatureReviewLoading && (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="relative">
              <div className="size-12 animate-spin rounded-full border-2 border-sky-700/20 border-t-sky-700 dark:border-sky-400/20 dark:border-t-sky-300" />
              <IconSearch
                size={16}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sky-700 dark:text-sky-300"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-stone-700 dark:text-white/70">
                {t("research.literature.loadingTitle")}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                {livePlan?.primaryEn
                  ? t("research.literature.loadingQuery", {
                      query: livePlan.primaryEn
                    })
                  : t("research.literature.loadingParse")}
              </p>
            </div>
          </div>
        )}

        {result && !literatureReviewLoading && (
          <div className="mt-5 space-y-5">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const active = view === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setView(tab.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                        active
                          ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                          : "border border-stone-200 bg-white text-stone-600 hover:border-stone-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55"
                      }`}
                    >
                      <Icon size={13} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {evidenceStats ? (
                  <span className="rounded-full border border-sky-700/20 bg-sky-700/[0.08] px-2.5 py-0.5 text-[10px] font-medium text-sky-900 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200">
                    {t("research.literature.statsSelected", {
                      selected: evidenceStats.selected
                    })}
                    <span className="mx-1 opacity-40">·</span>
                    {t("research.literature.statsPool", {
                      pool: evidenceStats.poolSize
                    })}
                    <span className="mx-1 opacity-40">·</span>
                    {t("research.literature.statsRequested", {
                      requested: evidenceStats.requested
                    })}
                  </span>
                ) : (
                  <span className="rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-[10px] text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-white/45">
                    {t("research.literature.statsSelected", {
                      selected: result.papers.length
                    })}
                  </span>
                )}
                {sourceBadges.map(s => (
                  <span
                    key={s}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      SOURCE_COLORS[s] ||
                      "bg-stone-100 text-stone-500 dark:bg-white/5 dark:text-white/40"
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {(result.domains?.length || result.queryPlan) && (
              <div className="rounded-2xl border border-stone-200/80 bg-white/70 px-4 py-3.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400">
                  {t("research.literature.domainPanel")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(result.domains || []).map(d => (
                    <span
                      key={d.id}
                      className="rounded-lg bg-sky-700/[0.08] px-2.5 py-1 text-[11px] text-sky-900 dark:bg-sky-400/10 dark:text-sky-200"
                    >
                      {isZh ? d.labelZh : d.labelEn}{" "}
                      <span className="opacity-55">
                        / {isZh ? d.labelEn : d.labelZh}
                      </span>
                    </span>
                  ))}
                  {!result.domains?.length && result.queryPlan?.backgroundZh ? (
                    <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] text-stone-500 dark:bg-white/5 dark:text-white/45">
                      {isZh
                        ? result.queryPlan.backgroundZh
                        : result.queryPlan.backgroundEn}
                      <span className="opacity-55">
                        {" "}
                        /{" "}
                        {isZh
                          ? result.queryPlan.backgroundEn
                          : result.queryPlan.backgroundZh}
                      </span>
                    </span>
                  ) : null}
                </div>
                {result.queryPlan?.primaryEn ? (
                  <p className="mt-2.5 font-mono text-[11px] leading-relaxed text-stone-500 dark:text-white/40">
                    <span className="text-stone-400">
                      {t("research.literature.cnToEn")}
                    </span>{" "}
                    {result.topic}
                    <span className="mx-1.5 opacity-40">→</span>
                    {result.queryPlan.primaryEn}
                  </p>
                ) : null}
              </div>
            )}

            {view === "lineage" && (
                <div key="lineage" className="space-y-4">
                  <section className="rounded-[1.35rem] border border-stone-200/90 bg-white p-6 dark:border-white/[0.07] dark:bg-[#12151a]">
                    <h2 className="font-serif text-lg text-stone-900 dark:text-white">
                      {t("research.literature.lineageTitle")}
                    </h2>
                    <p className="mt-3 text-[13.5px] leading-7 text-stone-600 dark:text-white/70">
                      {result.lineage?.narrative ||
                        t("research.literature.noNarrative")}
                    </p>
                  </section>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(result.lineage?.threads || []).map((thread, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-sky-800/10 bg-gradient-to-br from-sky-700/[0.05] to-transparent p-4 dark:border-sky-400/15 dark:from-sky-400/[0.07]"
                      >
                        <div className="mb-1 font-mono text-[10px] text-sky-700/60 dark:text-sky-300/50">
                          {t("research.literature.thread", { n: i + 1 })}
                        </div>
                        <h3 className="text-sm font-semibold text-sky-950 dark:text-sky-100">
                          {thread.name}
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-white/60">
                          {thread.description}
                        </p>
                        <p className="mt-3 font-mono text-[10px] text-stone-400">
                          {(thread.paperIds || []).join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {view === "review" && (
                <div key="review" className="space-y-3">
                  <section className="rounded-[1.35rem] border border-stone-200/90 bg-white p-6 dark:border-white/[0.07] dark:bg-[#12151a]">
                    <h2 className="font-serif text-lg text-stone-900 dark:text-white">
                      {t("research.literature.abstractTitle")}
                    </h2>
                    <p className="mt-3 text-[13.5px] leading-7 text-stone-600 dark:text-white/70">
                      {result.review.abstract}
                    </p>
                  </section>
                  {result.review.sections.map((section, i) => (
                    <section
                      key={i}
                      className="rounded-2xl border border-stone-200/70 bg-white/90 p-5 dark:border-white/[0.06] dark:bg-[#12151a]/80"
                    >
                      <h3 className="text-sm font-semibold text-stone-800 dark:text-white/85">
                        {section.heading}
                      </h3>
                      <p className="mt-2 text-[13px] leading-7 text-stone-600 dark:text-white/70">
                        {section.content}
                      </p>
                    </section>
                  ))}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-amber-600/15 bg-amber-500/[0.06] p-4">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        {t("research.literature.gaps")}
                      </h4>
                      <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-stone-600 dark:text-white/55">
                        {result.review.gaps.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-sky-600/15 bg-sky-500/[0.06] p-4">
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                        {t("research.literature.directions")}
                      </h4>
                      <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-stone-600 dark:text-white/55">
                        {result.review.futureDirections.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {view === "papers" && (
                <div key="papers" className="grid gap-3 sm:grid-cols-2">
                  {result.papers.map((paper, i) => (
                    <PaperRow
                      key={paper.id}
                      paper={paper}
                      index={i}
                      authorsUnknown={t("research.literature.authorsUnknown")}
                    />
                  ))}
                </div>
              )}

              {view === "timeline" && (
                <div
                  key="timeline"
                  className="rounded-[1.35rem] border border-stone-200/90 bg-white p-5 dark:border-white/[0.07] dark:bg-[#12151a]"
                >
                  <div className="space-y-0">
                    {result.timeline.map((item, i) => (
                      <div
                        key={`${item.paperId}-${item.year}-${i}`}
                        className="relative flex gap-3 pb-5 last:pb-0"
                      >
                        {i < result.timeline.length - 1 ? (
                          <div className="absolute left-[7px] top-3.5 bottom-0 w-px bg-stone-200 dark:bg-white/10" />
                        ) : null}
                        <div className="relative z-10 mt-1 size-3.5 shrink-0 rounded-full border-2 border-sky-700 bg-white dark:border-sky-400 dark:bg-[#12151a]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 leading-none">
                            <span className="text-[12px] font-semibold tabular-nums text-sky-800 dark:text-sky-300">
                              {item.year}
                            </span>
                            <span className="font-mono text-[11px] text-stone-400">
                              {item.paperId}
                            </span>
                          </div>
                          <div className="mt-1.5 text-sm font-medium leading-snug text-stone-800 dark:text-white/85">
                            {item.method}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-white/55">
                            {item.contribution}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
    </ModulePageShell>
  )
}
