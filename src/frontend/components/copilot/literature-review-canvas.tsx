"use client"

import { ChatbotUIContext } from "@/context/context"
import {
  CopilotContext,
  LiteraturePaper,
  LiteratureReviewResult
} from "@/context/copilot-context"
import { resolveModelProvider } from "@/lib/copilot-generator"
import { motion } from "framer-motion"
import {
  IconBook,
  IconBrandGithub,
  IconExternalLink,
  IconFileText,
  IconLoader2,
  IconPhoto,
  IconRefresh,
  IconTimeline,
  IconWand
} from "@tabler/icons-react"
import { FC, useContext, useMemo, useState } from "react"
import { toast } from "sonner"

function compactList(items?: string[]): string {
  if (!items || items.length === 0) return "未在检索摘要中说明"
  return items.filter(Boolean).join("; ") || "未在检索摘要中说明"
}

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function normalizeReviewResult(raw: Partial<LiteratureReviewResult>): LiteratureReviewResult {
  const topic = raw.topic || "文献综述"
  const papers = asArray(raw.papers)
  const timeline = asArray(raw.timeline)
  const references = asArray(raw.references)
  const poster = raw.poster || ({} as LiteratureReviewResult["poster"])
  const review = raw.review || ({} as LiteratureReviewResult["review"])
  const quality = raw.quality || ({} as LiteratureReviewResult["quality"])

  return {
    topic,
    papers,
    review: {
      abstract: review.abstract || "模型未返回可用的综述摘要。",
      sections: asArray(review.sections),
      gaps: asArray(review.gaps),
      futureDirections: asArray(review.futureDirections)
    },
    timeline,
    references,
    poster: {
      title: poster.title || `文献综述：${topic}`,
      subtitle: poster.subtitle || `已检索 ${papers.length} 篇论文`,
      problem: poster.problem || "模型未返回海报中的问题定义。",
      methodEvolution:
        asArray(poster.methodEvolution).length > 0
          ? asArray(poster.methodEvolution)
          : timeline.map(item => `${item.year}: ${item.method} [${item.paperId}]`),
      keyFindings:
        asArray(poster.keyFindings).length > 0
          ? asArray(poster.keyFindings)
          : asArray(review.gaps),
      takeaway: poster.takeaway || "请结合引用论文核查后再得出最终结论。"
    },
    quality: {
      topicRelevanceEstimate:
        typeof quality.topicRelevanceEstimate === "number"
          ? quality.topicRelevanceEstimate
          : 0,
      codeCoverage:
        typeof quality.codeCoverage === "number" ? quality.codeCoverage : 0,
      limitations: asArray(quality.limitations)
    }
  }
}

function resultToMarkdown(result: LiteratureReviewResult): string {
  const normalized = normalizeReviewResult(result)
  return [
    `# ${normalized.poster.title || `文献综述：${normalized.topic}`}`,
    "",
    `## 摘要`,
    normalized.review.abstract,
    "",
    `## 分主题综述`,
    ...normalized.review.sections.flatMap(section => [
      `### ${section.heading}`,
      section.content,
      ""
    ]),
    `## 算法发展时间线`,
    ...normalized.timeline.map(
      item => `- ${item.year}: ${item.method} (${item.paperId}) — ${item.contribution}`
    ),
    "",
    `## 参考文献`,
    ...normalized.references.map(ref => `- ${ref}`)
  ].join("\n")
}

const PaperCard: FC<{ paper: LiteraturePaper }> = ({ paper }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
              {paper.id}
            </span>
            <span className="text-[10px] text-gray-400">{paper.year}</span>
          </div>
          <a
            href={paper.url}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 text-sm font-medium text-gray-800 hover:text-violet-500 dark:text-white/85"
          >
            {paper.title}
          </a>
        </div>
        <a
          href={paper.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-gray-400 hover:text-violet-400"
          aria-label="Open paper"
        >
          <IconExternalLink size={14} />
        </a>
      </div>

      <p className="mb-2 line-clamp-3 text-xs leading-relaxed text-gray-500 dark:text-white/45">
        {paper.summary}
      </p>

      <div className="space-y-1 text-[11px] text-gray-500 dark:text-white/40">
        <div>
          <span className="text-gray-400 dark:text-white/25">方法： </span>
          {paper.method || "未在检索摘要中说明"}
        </div>
        <div>
          <span className="text-gray-400 dark:text-white/25">数据集： </span>
          {compactList(paper.datasets)}
        </div>
        <div>
          <span className="text-gray-400 dark:text-white/25">结果： </span>
          {compactList(paper.results)}
        </div>
      </div>

      {paper.code && (
        <a
          href={paper.code.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-2 text-[11px] text-emerald-400 hover:bg-emerald-500/15"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <IconBrandGithub size={13} />
            <span className="truncate">{paper.code.name}</span>
          </span>
          <span className="shrink-0 text-emerald-300/70">
            {paper.code.stars} stars · {paper.code.language}
          </span>
        </a>
      )}
    </motion.div>
  )
}

export const LiteratureReviewCanvas: FC = () => {
  const {
    currentIdea,
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

  const [topic, setTopic] = useState(currentIdea)

  const metrics = useMemo(() => {
    if (!literatureReview) return null
    return {
      papers: literatureReview.papers.length,
      code: literatureReview.papers.filter(paper => paper.code).length,
      relevance: Math.round(literatureReview.quality.topicRelevanceEstimate * 100),
      coverage: Math.round(literatureReview.quality.codeCoverage * 100)
    }
  }, [literatureReview])

  const generateReview = async () => {
    const reviewTopic = topic.trim() || currentIdea.trim()
    if (!reviewTopic) {
      toast.error("请先输入研究主题。")
      return
    }
    if (!chatSettings) {
      toast.error("请先选择一个模型。")
      return
    }

    const { provider, customModelId } = resolveModelProvider(
      chatSettings.model,
      models,
      availableHostedModels,
      availableLocalModels,
      availableOpenRouterModels
    )

    setLiteratureReviewLoading(true)
    setLiteratureReviewError(null)

    try {
      const response = await fetch("/api/literature-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: reviewTopic,
          maxPapers: 12,
          chatSettings,
          provider,
          customModelId
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.message || `HTTP ${response.status}`)
      }

      const result = normalizeReviewResult(
        (await response.json()) as Partial<LiteratureReviewResult>
      )
      setLiteratureReview(result)
      toast.success("文献综述已生成。")
    } catch (error: any) {
      setLiteratureReviewError(error.message || "文献综述生成失败。")
      toast.error("文献综述生成失败。")
    } finally {
      setLiteratureReviewLoading(false)
    }
  }

  const exportMarkdown = async () => {
    if (!literatureReview) return
    try {
      await navigator.clipboard.writeText(resultToMarkdown(literatureReview))
      toast.success("已复制为 Markdown。")
    } catch {
      toast.error("复制失败。")
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-3 flex items-center gap-2">
          <IconBook size={18} className="text-violet-400" />
          <div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              文献综述 Agent
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-white/35">
              arXiv 检索 + GitHub 代码关联 + 带引用综述生成
            </p>
          </div>
        </div>

        <textarea
          value={topic}
          onChange={event => setTopic(event.target.value)}
          placeholder="输入研究主题，例如：retrieval augmented generation evaluation"
          className="mb-2 min-h-[74px] w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none placeholder:text-gray-400 focus:border-violet-400 dark:border-white/10 dark:bg-black/20 dark:text-white/80 dark:placeholder:text-white/25"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={generateReview}
            disabled={literatureReviewLoading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-500/15 py-2 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/25 disabled:opacity-50"
          >
            {literatureReviewLoading ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : literatureReview ? (
              <IconRefresh size={14} />
            ) : (
              <IconWand size={14} />
            )}
            {literatureReview ? "重新生成综述" : "生成综述"}
          </button>
          <button
            onClick={exportMarkdown}
            disabled={!literatureReview}
            className="rounded-lg bg-gray-200 px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-300 disabled:opacity-40 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10"
          >
            导出
          </button>
        </div>
      </div>

      {literatureReviewError && (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {literatureReviewError}
        </div>
      )}

      {!literatureReview && !literatureReviewLoading && (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 text-center text-gray-400 dark:border-white/10 dark:text-white/30">
          <IconFileText size={38} className="mb-3 opacity-40" />
          <p className="text-sm">生成文献综述后，这里会展示论文、引用、演进时间线和海报内容。</p>
          <p className="mt-1 text-xs text-gray-400/70">
            检索失败时系统不会伪造论文。
          </p>
        </div>
      )}

      {literatureReviewLoading && (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-center text-gray-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40">
          <IconLoader2 size={34} className="mb-3 animate-spin text-violet-400" />
          <p className="text-sm">正在检索论文并生成综述...</p>
          <p className="mt-1 text-xs">需要访问 arXiv、GitHub 和本地/远程模型，通常耗时 20-60 秒。</p>
        </div>
      )}

      {literatureReview && !literatureReviewLoading && (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {metrics && (
            <div className="mb-3 grid grid-cols-4 gap-2">
              {[
                ["论文数", metrics.papers],
                ["代码仓库", metrics.code],
                ["相关度", `${metrics.relevance}%`],
                ["代码覆盖", `${metrics.coverage}%`]
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-center dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="text-sm font-semibold text-gray-800 dark:text-white/85">
                    {value}
                  </div>
                  <div className="text-[10px] text-gray-400">{label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
              <IconFileText size={16} className="text-violet-400" />
              带引用综述
            </div>
            <p className="mb-3 text-xs leading-relaxed text-gray-600 dark:text-white/55">
              {literatureReview.review.abstract}
            </p>
            <div className="space-y-3">
              {literatureReview.review.sections.map((section, index) => (
                <div key={`${section.heading}-${index}`}>
                  <h3 className="mb-1 text-xs font-semibold text-gray-700 dark:text-white/75">
                    {section.heading}
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-500 dark:text-white/45">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-3 grid gap-2 md:grid-cols-2">
            {literatureReview.papers.map((paper, index) => (
              <PaperCard key={`${paper.id}-${index}`} paper={paper} />
            ))}
          </div>

          <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
              <IconTimeline size={16} className="text-cyan-400" />
              算法发展演进时间线
            </div>
            <div className="space-y-2">
              {literatureReview.timeline
                .slice()
                .sort((a, b) => a.year - b.year)
                .map((item, index) => (
                  <div key={`${item.paperId}-${item.method}-${index}`} className="flex gap-3">
                    <div className="w-12 shrink-0 text-xs font-semibold text-cyan-400">
                      {item.year}
                    </div>
                    <div className="border-l border-cyan-500/20 pl-3">
                      <div className="text-xs font-medium text-gray-700 dark:text-white/75">
                        {item.method} · {item.paperId}
                      </div>
                      <p className="text-[11px] leading-relaxed text-gray-500 dark:text-white/40">
                        {item.contribution}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="mb-3 rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-300">
              <IconPhoto size={16} />
              海报草稿
            </div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {literatureReview.poster.title}
            </h3>
            <p className="mb-3 text-xs text-gray-500 dark:text-white/45">
              {literatureReview.poster.subtitle}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] font-semibold text-violet-300">问题定义</div>
                <p className="text-xs leading-relaxed text-gray-600 dark:text-white/50">
                  {literatureReview.poster.problem}
                </p>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-violet-300">核心结论</div>
                <p className="text-xs leading-relaxed text-gray-600 dark:text-white/50">
                  {literatureReview.poster.takeaway}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <div className="mb-1 text-[11px] font-semibold text-violet-300">
                  方法演进
                </div>
                <ul className="space-y-1 text-xs text-gray-600 dark:text-white/50">
                  {literatureReview.poster.methodEvolution.map((item, index) => (
                    <li key={`${item}-${index}`}>- {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-violet-300">
                  关键发现
                </div>
                <ul className="space-y-1 text-xs text-gray-600 dark:text-white/50">
                  {literatureReview.poster.keyFindings.map((item, index) => (
                    <li key={`${item}-${index}`}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="mb-2 text-sm font-semibold text-gray-800 dark:text-white/90">
              参考文献
            </div>
            <ol className="space-y-1 text-[11px] leading-relaxed text-gray-500 dark:text-white/45">
              {literatureReview.references.map((ref, index) => (
                <li key={`${ref}-${index}`}>{ref}</li>
              ))}
            </ol>
          </div>

          {literatureReview.quality.limitations.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="mb-2 text-sm font-semibold text-amber-300">
                质量与局限
              </div>
              <ul className="space-y-1 text-[11px] leading-relaxed text-gray-600 dark:text-white/50">
                {literatureReview.quality.limitations.map((item, index) => (
                  <li key={`${item}-${index}`}>- {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
