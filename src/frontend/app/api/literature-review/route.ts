import { ChatSettings } from "@/types"
import { loadSkillForMode } from "@/lib/server/load-skill"
import {
  mergeScholarlyPapers,
  searchMultiSource,
  type ScholarlyPaper
} from "@/lib/server/scholarly-search"
import { expandBilingualQueries } from "@/lib/server/domain-lexicon"
import {
  languageInstruction,
  lineageNarrativeHint,
  literatureSurveyTitle,
  modelHttpError,
  noPapersMessage,
  notInAbstract,
  resolveLiteratureLocale,
  synthesisIssueBadJson,
  synthesisIssueBadMeta,
  synthesisIssueCallFailed,
  synthesisIssueEmpty,
  synthesisIssueUnparsed,
  threadNameHint,
  type LiteratureLocale
} from "@/lib/server/literature-locale"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

interface LiteratureReviewRequest {
  topic: string
  maxPapers?: number
  chatSettings: ChatSettings
  provider: string
  customModelId?: string
  /** Extra text from uploaded notes / extracted files */
  contextNotes?: string
  /** UI locale: en | zh */
  locale?: string
}

interface CodeRepository {
  name: string
  url: string
  stars: number
  language: string
  description?: string
}

interface EvidencePaper {
  id: string
  title: string
  authors: string[]
  year: number
  summary: string
  url: string
  published: string
  relevance: number
  code: CodeRepository | null
  venue?: string
  citationCount?: number
  sources?: string[]
}

const topicCodeCache = new Map<string, Promise<CodeRepository | null>>()

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function getTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))
  return match ? decodeXml(match[1]) : ""
}

function getAuthors(entry: string): string[] {
  return [...entry.matchAll(/<author>[\s\S]*?<name[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/author>/gi)]
    .map(match => decodeXml(match[1]))
    .filter(Boolean)
}

function topicTerms(topic: string): string[] {
  const { phrases } = expandBilingualQueries(topic)
  return phrases
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/i)
    .map(term => term.trim())
    .filter(term => term.length > 2)
}

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text)
}

function expandTopicPhrases(topic: string): string[] {
  return expandBilingualQueries(topic).phrases
}

function relevanceScore(topic: string, title: string, summary: string): number {
  const terms = topicTerms(topic)
  if (terms.length === 0) return 0.5
  const haystack = `${title} ${summary}`.toLowerCase()
  const hits = terms.filter(term => haystack.includes(term)).length
  return Math.round((hits / terms.length) * 100) / 100
}

function quoteArxivPhrase(phrase: string): string {
  const trimmed = phrase.trim()
  if (!trimmed) return ""
  return /\s/.test(trimmed) || hasChinese(trimmed) ? `all:"${trimmed}"` : `all:${trimmed}`
}

function buildArxivSearchQueries(topic: string): string[] {
  const normalized = topic.trim().toLowerCase()
  if (normalized === "rag") {
    return [`all:"retrieval augmented generation" OR all:RAG`]
  }
  const phrases = expandTopicPhrases(topic)
  const queries = phrases.map(quoteArxivPhrase).filter(Boolean)
  const combined = phrases.slice(0, 4).map(quoteArxivPhrase).filter(Boolean).join(" OR ")
  return Array.from(new Set([combined, ...queries].filter(Boolean)))
}

function scholarlyToEvidence(
  topic: string,
  papers: ScholarlyPaper[],
  locale: LiteratureLocale = "en"
): EvidencePaper[] {
  const missing = notInAbstract(locale)
  return papers.map((paper, index) => ({
    id: `P${index + 1}`,
    title: paper.title,
    authors: paper.authors,
    year: paper.year,
    summary: paper.summary || missing,
    url: paper.url,
    published: paper.published,
    relevance: relevanceScore(topic, paper.title, paper.summary || ""),
    code: null,
    venue: paper.venue,
    citationCount: paper.citationCount,
    sources:
      Array.isArray((paper as any).sources) && (paper as any).sources.length
        ? (paper as any).sources
        : [paper.source]
  }))
}

function paperSelectionScore(paper: EvidencePaper): number {
  const abstractBonus = (paper.summary?.length || 0) > 80 ? 0.15 : 0
  const cite = Math.log10((paper.citationCount || 0) + 1) / 4
  return (paper.relevance || 0) + abstractBonus + Math.min(cite, 0.35)
}

/**
 * Pick up to `limit` papers with year diversity and abstract preference.
 * Avoids collapsing the survey onto a single recent cluster.
 */
function selectDiverseEvidencePapers(
  papers: EvidencePaper[],
  limit: number
): EvidencePaper[] {
  if (papers.length <= limit) {
    return papers
      .slice()
      .sort((a, b) => paperSelectionScore(b) - paperSelectionScore(a))
  }

  const ranked = papers
    .slice()
    .sort((a, b) => paperSelectionScore(b) - paperSelectionScore(a))

  const selected: EvidencePaper[] = []
  const used = new Set<string>()
  const yearCounts = new Map<number, number>()
  const maxPerYear = Math.max(2, Math.ceil(limit / 4))

  const tryAdd = (paper: EvidencePaper) => {
    const key = paper.url || `${paper.title}:${paper.year}`
    if (used.has(key)) return false
    const yCount = yearCounts.get(paper.year) || 0
    if (yCount >= maxPerYear && selected.length >= Math.floor(limit * 0.6)) {
      return false
    }
    used.add(key)
    yearCounts.set(paper.year, yCount + 1)
    selected.push(paper)
    return true
  }

  // Pass 1: prefer papers with real abstracts
  for (const paper of ranked) {
    if (selected.length >= limit) break
    if ((paper.summary?.length || 0) > 80) tryAdd(paper)
  }
  // Pass 2: fill remaining by score
  for (const paper of ranked) {
    if (selected.length >= limit) break
    tryAdd(paper)
  }

  return selected
    .sort((a, b) => paperSelectionScore(b) - paperSelectionScore(a))
    .map((paper, index) => ({ ...paper, id: `P${index + 1}` }))
}

async function fetchMergedEvidence(
  topic: string,
  maxPapers: number,
  locale: LiteratureLocale = "en"
): Promise<{
  papers: EvidencePaper[]
  poolSize: number
  sourcesUsed: string[]
  domains: { id: string; labelZh: string; labelEn: string }[]
  queryPlan: {
    phrases: string[]
    primaryEn: string
    backgroundZh: string
    backgroundEn: string
  }
}> {
  const poolTarget = Math.min(Math.max(maxPapers * 3, maxPapers + 20), 90)
  const [arxivPapers, multi] = await Promise.all([
    fetchArxivPapers(topic, maxPapers, locale).catch(() => [] as EvidencePaper[]),
    searchMultiSource(topic, poolTarget)
  ])

  const sourcesUsed = new Set<string>(multi.sourcesUsed)
  if (arxivPapers.length) sourcesUsed.add("arXiv")

  const arxivAsScholarly: ScholarlyPaper[] = arxivPapers.map(p => ({
    key: `arxiv:${p.url}`,
    title: p.title,
    authors: p.authors,
    year: p.year,
    summary: p.summary,
    url: p.url,
    published: p.published,
    source: "arxiv" as const,
    citationCount: 0
  }))

  const merged = mergeScholarlyPapers(
    [multi.papers, arxivAsScholarly],
    poolTarget
  )

  const scored = scholarlyToEvidence(topic, merged, locale)
  const selected = selectDiverseEvidencePapers(scored, maxPapers)

  return {
    papers: selected,
    poolSize: scored.length,
    sourcesUsed: Array.from(sourcesUsed),
    domains: multi.domains.map(d => ({
      id: d.id,
      labelZh: d.labelZh,
      labelEn: d.labelEn
    })),
    queryPlan: multi.queryPlan
  }
}

async function fetchArxivPapers(
  topic: string,
  maxPapers: number,
  locale: LiteratureLocale = "en"
): Promise<EvidencePaper[]> {
  const queries = buildArxivSearchQueries(topic)
  const papersByUrl = new Map<string, EvidencePaper>()
  const perQueryLimit = Math.min(Math.max(maxPapers * 4, 24), 50)

  for (const query of queries) {
    const params = new URLSearchParams({
      search_query: query,
      start: "0",
      max_results: String(perQueryLimit),
      sortBy: "submittedDate",
      sortOrder: "descending"
    })

    const response = await fetch(`https://export.arxiv.org/api/query?${params}`, {
      headers: { "User-Agent": "MentorOS/2.0 literature-review-agent" },
      next: { revalidate: 3600 }
    })

    if (!response.ok) {
      continue
    }

    const xml = await response.text()
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(match => match[1])

    entries.forEach(entry => {
      const title = getTag(entry, "title")
      const summary = getTag(entry, "summary")
      const published = getTag(entry, "published")
      const year = Number.parseInt(published.slice(0, 4), 10) || new Date().getFullYear()
      const url = getTag(entry, "id")
      if (!url || papersByUrl.has(url)) return

      papersByUrl.set(url, {
        id: "",
        title,
        authors: getAuthors(entry),
        year,
        summary,
        url,
        published,
        relevance: relevanceScore(topic, title, summary),
        code: null
      })
    })
  }

  return Array.from(papersByUrl.values())
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance
      return b.published.localeCompare(a.published)
    })
    .map((paper, index) => ({ ...paper, id: `P${index + 1}` }))
}

function inferMethod(paper: EvidencePaper, locale: LiteratureLocale = "en"): string {
  const text = `${paper.title} ${paper.summary}`.toLowerCase()
  const candidates = [
    ["retrieval-augmented generation", /retrieval-augmented|rag\b|retrieval augmented/],
    ["knowledge graph enhanced RAG", /knowledge graph|kg/],
    ["multimodal retrieval", /multimodal|document retrieval|image|vision/],
    ["cache-aware inference", /cache/],
    ["tool-augmented generation", /tool/],
    ["vector retrieval", /vector|embedding|hubness|anisotropic/],
    ["agentic RAG", /agent|agentic/]
  ] as const
  const match = candidates.find(([, pattern]) => pattern.test(text))
  return match ? match[0] : notInAbstract(locale)
}

function extractDatasets(summary: string): string[] {
  const matches = summary.match(
    /\b[A-Z][A-Za-z0-9_-]*(?:\s+[A-Z][A-Za-z0-9_-]*){0,3}\s+(?:dataset|benchmark|corpus|data set)\b/g
  )
  return matches ? Array.from(new Set(matches)).slice(0, 3) : []
}

function summarizePaper(paper: EvidencePaper, locale: LiteratureLocale = "en"): string {
  const firstSentence =
    paper.summary.split(/(?<=[.!?])\s+/).find(sentence => sentence.length > 60) ||
    paper.summary.slice(0, 260)
  return locale === "zh"
    ? `${paper.title} 主要讨论 ${firstSentence.trim()} [${paper.id}]`
    : `${paper.title} primarily discusses ${firstSentence.trim()} [${paper.id}]`
}

function buildEvidenceSynthesisReview(
  topic: string,
  papers: EvidencePaper[],
  synthesisIssue?: string,
  locale: LiteratureLocale = "en"
) {
  const missing = notInAbstract(locale)
  const references = papers.map(
    paper =>
      `[${paper.id}] ${paper.authors.slice(0, 3).join(", ")}. ${paper.title}. ${paper.year}. ${paper.url}`
  )
  const papersWithMethods = papers.map(paper => ({
    ...paper,
    method: inferMethod(paper, locale),
    datasets: extractDatasets(paper.summary),
    results: [missing],
    summary: summarizePaper(paper, locale),
    brief: summarizePaper(paper, locale).slice(0, 180)
  }))
  const corePapers = papers.slice(0, 4)
  const applicationPapers = papers.slice(4, 8)
  const codeCount = papers.filter(paper => paper.code).length
  const issueText =
    locale === "zh"
      ? synthesisIssue
        ? `模型结构化综合未通过解析（${synthesisIssue}），以下内容由系统基于检索摘要自动整理。`
        : "以下内容由系统基于检索摘要自动整理。"
      : synthesisIssue
        ? `Structured model synthesis failed (${synthesisIssue}). The content below is auto-organized from retrieved abstracts.`
        : "The content below is auto-organized from retrieved abstracts."

  const coreTitles = corePapers
    .slice(0, 2)
    .map(paper => `${paper.title} [${paper.id}]`)
    .join(locale === "zh" ? "、" : "; ")

  return {
    topic,
    papers: papersWithMethods,
    review: {
      abstract:
        locale === "zh"
          ? `围绕“${topic}”，系统检索到 ${papers.length} 篇近期论文，并按相关度与代码可用性排序。整体来看，这批工作覆盖了该主题下的任务设定、方法设计、应用场景和工程优化等方向：例如 ${coreTitles}。${issueText}`
          : `For “${topic}”, the system retrieved ${papers.length} recent papers ranked by relevance and code availability. Overall, this set covers task settings, method design, applications, and engineering optimizations — for example ${coreTitles}. ${issueText}`,
      sections:
        locale === "zh"
          ? [
              {
                heading: "任务设定与评估数据",
                content: corePapers
                  .map(
                    paper =>
                      `${paper.title} 体现了该方向在任务设定或评估证据上的扩展 [${paper.id}]。`
                  )
                  .join(" ")
              },
              {
                heading: "系统、工具调用与应用场景",
                content: (applicationPapers.length > 0 ? applicationPapers : corePapers)
                  .map(
                    paper =>
                      `${paper.title} 展示了该主题在具体系统或应用问题中的落地方式 [${paper.id}]。`
                  )
                  .join(" ")
              },
              {
                heading: "效率、检索质量与工程优化",
                content:
                  papers
                    .filter(paper =>
                      /cache|retrieval|vector|stream|tool|hubness/i.test(
                        `${paper.title} ${paper.summary}`
                      )
                    )
                    .slice(0, 4)
                    .map(
                      paper =>
                        `${paper.title} 关注检索、证据排序或推理效率问题 [${paper.id}]。`
                    )
                    .join(" ") || "检索结果中暂未形成清晰的效率优化主题。"
              }
            ]
          : [
              {
                heading: "Task settings and evaluation data",
                content: corePapers
                  .map(
                    paper =>
                      `${paper.title} extends task settings or evaluation evidence in this area [${paper.id}].`
                  )
                  .join(" ")
              },
              {
                heading: "Systems, tools, and applications",
                content: (applicationPapers.length > 0 ? applicationPapers : corePapers)
                  .map(
                    paper =>
                      `${paper.title} shows how the topic lands in concrete systems or application problems [${paper.id}].`
                  )
                  .join(" ")
              },
              {
                heading: "Efficiency, retrieval quality, and engineering",
                content:
                  papers
                    .filter(paper =>
                      /cache|retrieval|vector|stream|tool|hubness/i.test(
                        `${paper.title} ${paper.summary}`
                      )
                    )
                    .slice(0, 4)
                    .map(
                      paper =>
                        `${paper.title} focuses on retrieval, evidence ranking, or inference efficiency [${paper.id}].`
                    )
                    .join(" ") ||
                  "No clear efficiency-optimization theme emerged in the retrieved set."
              }
            ],
      gaps:
        locale === "zh"
          ? [
              `当前检索结果中只有 ${codeCount}/${papers.length} 篇论文找到候选 GitHub 仓库，复现材料覆盖不足。`,
              "多数摘要没有提供完整数据集和指标细节，需要进一步阅读原文确认实验设置。",
              "仅基于公开摘要进行综合，无法替代全文级证据抽取。"
            ]
          : [
              `Only ${codeCount}/${papers.length} papers have candidate GitHub repos in this retrieval; reproducibility coverage is limited.`,
              "Most abstracts lack full dataset and metric details; verify experimental settings in the full papers.",
              "Synthesis is based on public abstracts and cannot replace full-text evidence extraction."
            ],
      futureDirections:
        locale === "zh"
          ? [
              "补充更多全文解析或人工上传 PDF，以提高代码关联和指标抽取能力。",
              "对候选论文进行全文解析，抽取 dataset、baseline、metric 和 quantitative result。",
              "将大主题拆分为 evaluation、optimization、agentic system、multimodal learning 等子方向后分别综述。"
            ]
          : [
              "Add full-text parsing or uploaded PDFs to improve code linking and metric extraction.",
              "Parse candidate papers for datasets, baselines, metrics, and quantitative results.",
              "Split the broad topic into evaluation, optimization, agentic systems, multimodal learning, and synthesize each thread separately."
            ]
    },
    timeline: papers
      .map(paper => ({
        year: paper.year,
        method: inferMethod(paper, locale),
        paperId: paper.id,
        contribution:
          locale === "zh"
            ? `${paper.title} 在 ${inferMethod(paper, locale)} 方向提供了一个可检索证据点 [${paper.id}]。`
            : `${paper.title} contributes an evidence point on ${inferMethod(paper, locale)} [${paper.id}].`
      }))
      .sort((a, b) => a.year - b.year),
    references,
    poster: {
      title: literatureSurveyTitle(locale, topic),
      subtitle:
        locale === "zh"
          ? `已检索 ${papers.length} 篇论文，其中 ${codeCount} 篇有关联代码候选`
          : `Retrieved ${papers.length} papers; ${codeCount} with candidate code links`,
      problem:
        locale === "zh"
          ? "当前海报内容基于真实检索摘要整理，请以证据列表作为素材来源。"
          : "Poster content is grounded in retrieved abstracts; use the evidence list as the source of truth.",
      methodEvolution: papers.map(
        paper => `${paper.year}: ${paper.title} [${paper.id}]`
      ),
      keyFindings:
        locale === "zh"
          ? [
              `检索结果覆盖 ${papers.length} 篇近期论文，主题集中在任务设定、方法设计、应用框架和工程优化。`
            ]
          : [
              `Coverage spans ${papers.length} recent papers across task settings, methods, applications, and engineering.`
            ],
      takeaway:
        locale === "zh"
          ? "当前可见结论仅限于检索到的元数据与摘要证据。"
          : "Visible conclusions are limited to retrieved metadata and abstract evidence."
    },
    quality: {
      topicRelevanceEstimate:
        papers.length === 0
          ? 0
          : Math.round(
              (papers.reduce((sum, paper) => sum + paper.relevance, 0) /
                papers.length) *
                100
            ) / 100,
      codeCoverage:
        papers.length === 0
          ? 0
          : Math.round((codeCount / papers.length) * 100) / 100,
      limitations: [
        locale === "zh"
          ? synthesisIssue
            ? `模型结构化 JSON 解析失败：${synthesisIssue}`
            : "使用规则证据综述兜底，未调用模型自由发挥。"
          : synthesisIssue
            ? `Structured JSON parse failed: ${synthesisIssue}`
            : "Fell back to rule-based evidence synthesis without free-form model invention."
      ]
    }
  }
}

function significantWords(text: string): string[] {
  const stopwords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "into",
    "using",
    "based",
    "towards",
    "toward",
    "large",
    "language",
    "model",
    "models",
    "paper",
    "study",
    "survey"
  ])
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length > 2 && !stopwords.has(word))
}

function arxivIdFromUrl(url: string): string {
  return url.split("/").pop()?.replace(/^abs\//, "") || ""
}

function githubQueriesForPaper(paper: EvidencePaper, topic: string): string[] {
  const titleWords = significantWords(paper.title)
  const topicWords = significantWords(expandTopicPhrases(topic).join(" "))
  const methodWords = significantWords(inferMethod(paper))
  const arxivId = arxivIdFromUrl(paper.url)
  const titleCore = titleWords.slice(0, 8).join(" ")
  const titleShort = titleWords.slice(0, 5).join(" ")
  const topicCore = topicWords.slice(0, 6).join(" ")
  const methodCore = methodWords.slice(0, 4).join(" ")

  return Array.from(
    new Set(
      [
        titleCore && `${titleCore} in:name,description,readme`,
        arxivId && `${arxivId} in:readme,description`,
        titleShort && `${titleShort} official implementation in:name,description,readme`,
        methodCore && topicCore && `${methodCore} ${topicCore} code in:name,description,readme`
      ].filter(Boolean) as string[]
    )
  ).slice(0, process.env.GITHUB_TOKEN ? 4 : 2)
}

function scoreRepository(repo: any, paper: EvidencePaper, topic: string): number {
  const searchable = `${repo.full_name || ""} ${repo.description || ""}`.toLowerCase()
  if (/awesome|paper-list|papers-list|reading-list|survey|collection|resources/.test(searchable)) {
    return 0
  }

  const titleWords = significantWords(paper.title)
  const topicWords = significantWords(expandTopicPhrases(topic).join(" "))
  const methodWords = significantWords(inferMethod(paper))
  const arxivId = arxivIdFromUrl(paper.url).toLowerCase()

  let score = 0
  for (const word of titleWords) {
    if (searchable.includes(word)) score += 3
  }
  for (const word of topicWords) {
    if (searchable.includes(word)) score += 2
  }
  for (const word of methodWords) {
    if (searchable.includes(word)) score += 2
  }
  if (arxivId && searchable.includes(arxivId)) score += 8
  if (/official|paper|implementation|code|pytorch|tensorflow|jax/.test(searchable)) {
    score += 2
  }
  score += Math.min(Math.log10((repo.stargazers_count || 0) + 1), 3)
  return Math.round(score * 100) / 100
}

function topicGithubQueries(topic: string): string[] {
  const topicCore = significantWords(expandTopicPhrases(topic).join(" ")).slice(0, 8).join(" ")
  return Array.from(
    new Set(
      [
        topicCore && `${topicCore} implementation in:name,description,readme`,
        topicCore && `${topicCore} pytorch in:name,description,readme`,
        topicCore && `${topicCore} code in:name,description,readme`
      ].filter(Boolean) as string[]
    )
  ).slice(0, process.env.GITHUB_TOKEN ? 3 : 1)
}

function scoreTopicRepository(repo: any, topic: string): number {
  const searchable = `${repo.full_name || ""} ${repo.description || ""}`.toLowerCase()
  if (/awesome|paper-list|papers-list|reading-list|survey|collection|resources/.test(searchable)) {
    return 0
  }

  let score = 0
  for (const word of significantWords(expandTopicPhrases(topic).join(" "))) {
    if (searchable.includes(word)) score += 2
  }
  if (/official|implementation|code|pytorch|tensorflow|jax|benchmark|framework/.test(searchable)) {
    score += 2
  }
  score += Math.min(Math.log10((repo.stargazers_count || 0) + 1), 3)
  return Math.round(score * 100) / 100
}

async function findCodeRepository(
  paper: EvidencePaper,
  topic: string
): Promise<CodeRepository | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "MentorOS/2.0 literature-review-agent"
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const candidates: any[] = []

  try {
    for (const query of githubQueriesForPaper(paper, topic)) {
      const params = new URLSearchParams({
        q: query,
        sort: "stars",
        order: "desc",
        per_page: "3"
      })
      const response = await fetch(`https://api.github.com/search/repositories?${params}`, {
        headers,
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000)
      })

      if (!response.ok) continue

      const data = await response.json()
      candidates.push(...(data.items || []))
    }

    const uniqueCandidates = Array.from(
      new Map(candidates.map(repo => [repo.full_name, repo])).values()
    )
    const scored = uniqueCandidates
      .map(repo => ({ repo, score: scoreRepository(repo, paper, topic) }))
      .filter(item => item.score >= 6)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return (b.repo.stargazers_count || 0) - (a.repo.stargazers_count || 0)
      })

    let repo = scored[0]?.repo
    if (!repo) {
      const cacheKey = topic.trim().toLowerCase()
      if (!topicCodeCache.has(cacheKey)) {
        topicCodeCache.set(cacheKey, findTopicCodeRepository(topic, headers))
      }
      return topicCodeCache.get(cacheKey) || null
    }

    if (!repo) return null

    return {
      name: repo.full_name,
      url: repo.html_url,
      stars: repo.stargazers_count || 0,
      language: repo.language || "Unknown",
      description: repo.description || ""
    }
  } catch {
    return null
  }
}

async function findTopicCodeRepository(
  topic: string,
  headers: Record<string, string>
): Promise<CodeRepository | null> {
  const topicCandidates: any[] = []
  for (const query of topicGithubQueries(topic)) {
    const params = new URLSearchParams({
      q: query,
      sort: "stars",
      order: "desc",
      per_page: "3"
    })
    const response = await fetch(`https://api.github.com/search/repositories?${params}`, {
      headers,
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000)
    })
    if (!response.ok) continue
    const data = await response.json()
    topicCandidates.push(...(data.items || []))
  }

  const repo = Array.from(new Map(topicCandidates.map(item => [item.full_name, item])).values())
    .map(item => ({ repo: item, score: scoreTopicRepository(item, topic) }))
    .filter(item => item.score >= 6)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (b.repo.stargazers_count || 0) - (a.repo.stargazers_count || 0)
    })[0]?.repo

  if (!repo) return null
  return {
    name: repo.full_name,
    url: repo.html_url,
    stars: repo.stargazers_count || 0,
    language: repo.language || "Unknown",
    description: repo.description || ""
  }
}

function buildFallbackReview(
  topic: string,
  papers: EvidencePaper[],
  locale: LiteratureLocale = "en"
) {
  return buildEvidenceSynthesisReview(
    topic,
    papers,
    synthesisIssueUnparsed(locale),
    locale
  )
}

function buildMetadataOnlyReview(
  topic: string,
  papers: EvidencePaper[],
  locale: LiteratureLocale = "en"
) {
  const missing = notInAbstract(locale)
  const references = papers.map(
    paper =>
      `[${paper.id}] ${paper.authors.slice(0, 3).join(", ")}. ${paper.title}. ${paper.year}. ${paper.url}`
  )
  const codeCount = papers.filter(p => p.code).length

  return {
    topic,
    papers: papers.map(paper => ({
      ...paper,
      method: missing,
      datasets: [],
      results: []
    })),
    review: {
      abstract:
        locale === "zh"
          ? `已为“${topic}”检索到 ${papers.length} 篇近期论文。当前模型综述不可用，因此这里只展示可核验的论文元数据和摘要信息。`
          : `Retrieved ${papers.length} recent papers for “${topic}”. Model synthesis is unavailable, so only verifiable metadata and abstracts are shown.`,
      sections: papers.slice(0, 4).map(paper => ({
        heading: paper.title,
        content: `${paper.summary.slice(0, 600)} [${paper.id}]`
      })),
      gaps: [
        locale === "zh"
          ? "需要使用可用模型进一步综合多篇论文之间的研究空白。"
          : "A capable model is needed to further synthesize research gaps across papers."
      ],
      futureDirections: [
        locale === "zh"
          ? "在得出实验性结论前，请先核查链接论文和关联代码仓库。"
          : "Verify linked papers and code repositories before drawing experimental conclusions."
      ]
    },
    timeline: papers
      .map(paper => ({
        year: paper.year,
        method: paper.title,
        paperId: paper.id,
        contribution:
          locale === "zh"
            ? `详见 ${paper.id} 的检索摘要。`
            : `See the retrieved abstract for ${paper.id}.`
      }))
      .sort((a, b) => a.year - b.year),
    references,
    poster: {
      title: literatureSurveyTitle(locale, topic),
      subtitle:
        locale === "zh"
          ? `已检索 ${papers.length} 篇论文，其中 ${codeCount} 篇有关联代码候选`
          : `Retrieved ${papers.length} papers; ${codeCount} with candidate code links`,
      problem:
        locale === "zh"
          ? "当前海报内容基于真实检索摘要整理，请以证据列表作为素材来源。"
          : "Poster content is grounded in retrieved abstracts; use the evidence list as the source of truth.",
      methodEvolution: papers.map(
        paper => `${paper.year}: ${paper.title} [${paper.id}]`
      ),
      keyFindings: [
        locale === "zh"
          ? "系统仅展示检索证据支持的发现，未补写摘要之外的实验结论。"
          : "Only evidence-supported findings are shown; no extra experimental claims were invented."
      ],
      takeaway:
        locale === "zh"
          ? "当前可见结论仅限于检索到的元数据。"
          : "Visible conclusions are limited to retrieved metadata."
    },
    quality: {
      topicRelevanceEstimate:
        papers.length === 0
          ? 0
          : Math.round(
              (papers.reduce((sum, paper) => sum + paper.relevance, 0) /
                papers.length) *
                100
            ) / 100,
      codeCoverage:
        papers.length === 0
          ? 0
          : Math.round((codeCount / papers.length) * 100) / 100,
      limitations: [
        locale === "zh"
          ? "模型综合失败或返回了无效 JSON；系统未推断额外事实。"
          : "Model synthesis failed or returned invalid JSON; no extra facts were inferred."
      ]
    }
  }
}

function normalizeReviewResult(
  raw: any,
  topic: string,
  papers: EvidencePaper[],
  locale: LiteratureLocale = "en"
) {
  const fallback = buildFallbackReview(topic, papers, locale)
  const result = raw && typeof raw === "object" ? raw : {}
  const review = result.review || {}
  const poster = result.poster || {}
  const quality = result.quality || {}
  const modelLimitations = asArray(quality.limitations)

  const countNote =
    locale === "zh"
      ? `本次综述固定纳入检索证据中的 ${papers.length} 篇论文（P1–P${papers.length}），不以模型自行增减篇数为准。`
      : `This survey is locked to ${papers.length} retrieved evidence papers (P1–P${papers.length}); the model may not add or drop papers.`

  return {
    ...fallback,
    ...result,
    topic: result.topic || topic,
    // Never trust model-provided paper metadata. This prevents fake authors,
    // fake URLs, and example.com references from reaching the UI.
    papers: fallback.papers.map((paper, i) => {
      const modelPapers = asArray(result.papers) as Record<string, any>[]
      const modelPaper =
        modelPapers.find(p => String(p?.id || "") === paper.id) ||
        modelPapers[i] ||
        {}
      return {
        ...paper,
        brief:
          typeof modelPaper.brief === "string" && modelPaper.brief.trim()
            ? modelPaper.brief
            : paper.summary.slice(0, 160),
        method:
          typeof modelPaper.method === "string" ? modelPaper.method : (paper as any).method,
        summary:
          typeof modelPaper.summary === "string" && modelPaper.summary.trim()
            ? modelPaper.summary
            : paper.summary
      }
    }),
    lineage: {
      narrative:
        result.lineage?.narrative ||
        (locale === "zh"
          ? `围绕「${topic}」，检索到 ${papers.length} 篇公开论文。可按年份与方法线索阅读下方时间线与分主题综述。`
          : `Retrieved ${papers.length} public papers on “${topic}”. Use the timeline and themed sections below to follow methods by year.`),
      threads:
        asArray(result.lineage?.threads).length > 0
          ? asArray(result.lineage.threads)
          : [
              {
                name: locale === "zh" ? "主题主线" : "Main thread",
                description:
                  locale === "zh"
                    ? `与「${topic}」直接相关的核心工作。`
                    : `Core work directly related to “${topic}”.`,
                paperIds: papers.map(p => p.id)
              }
            ]
    },
    review: {
      abstract: review.abstract || fallback.review.abstract,
      sections: asArray(review.sections).length > 0 ? asArray(review.sections) : fallback.review.sections,
      gaps: asArray(review.gaps).length > 0 ? asArray(review.gaps) : fallback.review.gaps,
      futureDirections:
        asArray(review.futureDirections).length > 0
          ? asArray(review.futureDirections)
          : fallback.review.futureDirections
    },
    // Always use evidence-derived timeline so entry count matches selected papers.
    timeline: fallback.timeline,
    references: fallback.references,
    poster: {
      title: poster.title || fallback.poster.title,
      subtitle: poster.subtitle || fallback.poster.subtitle,
      problem: poster.problem || fallback.poster.problem,
      methodEvolution:
        asArray(poster.methodEvolution).length > 0
          ? asArray(poster.methodEvolution)
          : fallback.poster.methodEvolution,
      keyFindings:
        asArray(poster.keyFindings).length > 0
          ? asArray(poster.keyFindings)
          : asArray(review.gaps),
      takeaway: poster.takeaway || fallback.poster.takeaway
    },
    quality: {
      topicRelevanceEstimate:
        typeof quality.topicRelevanceEstimate === "number"
          ? quality.topicRelevanceEstimate
          : fallback.quality.topicRelevanceEstimate,
      codeCoverage:
        typeof quality.codeCoverage === "number"
          ? quality.codeCoverage
          : fallback.quality.codeCoverage,
      limitations: Array.from(
        new Set([
          ...modelLimitations,
          countNote,
          locale === "zh"
            ? "论文列表、作者、年份、URL 和参考文献已强制使用真实检索证据，未采用模型生成的元数据。"
            : "Paper lists, authors, years, URLs, and references are forced to use retrieved evidence; model-invented metadata was discarded."
        ])
      )
    }
  }
}

function extractJson(text: string): string {
  const start = text.indexOf("{")
  if (start === -1) return text

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]

    if (escaped) {
      escaped = false
      continue
    }
    if (ch === "\\") {
      escaped = true
      continue
    }
    if (ch === "\"") {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === "{") depth += 1
    if (ch === "}") depth -= 1
    if (depth === 0) return text.slice(start, i + 1)
  }

  return text.slice(start)
}

function hasUnsupportedModelMetadata(result: any, papers: EvidencePaper[]): boolean {
  const serialized = JSON.stringify(result || {}).toLowerCase()
  if (/example\.com|doe,\s*j|john doe|jane doe/.test(serialized)) {
    return true
  }

  const evidenceUrls = new Set(papers.map(paper => paper.url.toLowerCase()))
  const modelUrls = [
    ...asArray(result?.papers).map((paper: any) => String(paper?.url || "").toLowerCase()),
    ...asArray(result?.references)
      .map((reference: any) => String(reference).match(/https?:\/\/\S+/)?.[0]?.toLowerCase())
      .filter(Boolean)
  ]

  return modelUrls.some(url => url && !evidenceUrls.has(url.replace(/[)\].,;]+$/, "")))
}

function buildSynthesisPrompt(
  topic: string,
  papers: EvidencePaper[],
  contextNotes?: string,
  domains?: { labelZh: string; labelEn: string }[],
  primaryEn?: string,
  locale: LiteratureLocale = "en"
): string {
  const evidence = papers.map(paper => ({
    id: paper.id,
    title: paper.title,
    authors: paper.authors,
    year: paper.year,
    abstract: paper.summary,
    url: paper.url,
    relevance: paper.relevance,
    venue: paper.venue,
    citationCount: paper.citationCount,
    sources: paper.sources,
    code: paper.code
  }))

  const skillPrompt = loadSkillForMode("literature-review")
  const missing = notInAbstract(locale)
  const domainLine =
    domains && domains.length
      ? `Detected research domains (bilingual): ${domains
          .map(d => `${d.labelZh} / ${d.labelEn}`)
          .join("; ")}.\nPrimary English search query used: ${primaryEn || topic}.\nGround claims in English evidence abstracts; write user-facing narrative in the UI language specified below.\n`
      : primaryEn
        ? `Primary English search query used: ${primaryEn}.\n`
        : ""
  const notesBlock = contextNotes?.trim()
    ? `\nAdditional user notes / uploaded excerpts (use only as topic guidance, do not invent citations from them unless they contain explicit bibliographic facts):\n${contextNotes.trim().slice(0, 8000)}\n`
    : ""

  const formatContract = `You are a careful literature review agent. ${languageInstruction(locale)} Use ONLY the evidence below. Do not invent datasets, metrics, repositories, authors, years, or results. If a dataset or result is not present in the abstract, write "${missing}". Every paper-specific claim must cite paper ids like [P1].

CRITICAL COUNT RULES:
- The evidence list contains exactly ${papers.length} papers with ids P1..P${papers.length}.
- Your "papers" array MUST include exactly these ${papers.length} ids (same order preferred). Do not drop, merge, or invent papers.
- Any narrative that mentions how many papers were retrieved MUST say ${papers.length} (not another number).
- Timeline entries should cover the selected papers (one entry per paper when possible).

UI locale: ${locale}
Topic: ${topic}
${domainLine}${notesBlock}
Evidence JSON (${papers.length} papers):
${JSON.stringify(evidence, null, 2)}

Return ONLY valid JSON. Do not wrap it in Markdown. Do not add comments. Use null for missing code repositories. Use arrays for datasets, results, sections, gaps, futureDirections, timeline, references, methodEvolution, keyFindings, limitations, and lineage.threads.

Required shape:
{
  "topic": "string",
  "papers": [
    {
      "id": "P1",
      "title": "string",
      "authors": ["string"],
      "year": 2025,
      "summary": "1-2 sentence evidence-grounded summary with citation",
      "brief": "one-sentence card blurb with citation",
      "method": "algorithm or method, or not specified",
      "datasets": ["dataset names, or not specified in the retrieved abstract"],
      "results": ["reported results, or not specified in the retrieved abstract"],
      "url": "string",
      "code": null
    }
  ],
  "lineage": {
    "narrative": "${lineageNarrativeHint(locale)}",
    "threads": [
      {
        "name": "${threadNameHint(locale)}",
        "description": "what this thread focuses on, with citations",
        "paperIds": ["P1", "P2"]
      }
    ]
  },
  "review": {
    "abstract": "150-220 words with citations",
    "sections": [
      { "heading": "theme name", "content": "theme synthesis with citations" }
    ],
    "gaps": ["evidence-grounded gap with citations"],
    "futureDirections": ["future direction with citations"]
  },
  "timeline": [
    { "year": 2025, "method": "method name", "paperId": "P1", "contribution": "chronological contribution with citation" }
  ],
  "references": ["[P1] Author. Title. Year. URL"],
  "poster": {
    "title": "poster title",
    "subtitle": "poster subtitle",
    "problem": "core problem with citations",
    "methodEvolution": ["timeline bullet with citations"],
    "keyFindings": ["finding or limitation with citations"],
    "takeaway": "one sentence takeaway"
  },
  "quality": {
    "topicRelevanceEstimate": 0.85,
    "codeCoverage": 0.5,
    "limitations": ["limitations of retrieved evidence"]
  }
}`

  if (!skillPrompt) return formatContract
  return `${skillPrompt}

---
OUTPUT CONTRACT (must follow exactly — overrides conflicting format notes above):
${formatContract}`
}

async function generateSynthesisContent(
  request: NextRequest,
  json: LiteratureReviewRequest,
  prompt: string
): Promise<string> {
  if (json.provider === "ollama") {
    const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434"
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: json.chatSettings.model,
        stream: false,
        format: "json",
        options: {
          temperature: Math.min(json.chatSettings.temperature || 0.2, 0.3)
        },
        messages: [
          {
            role: "system",
            content:
              "你是严格的 JSON 生成器。只能输出一个合法 JSON object，不要输出 Markdown、解释、代码块或 <think>。"
          },
          { role: "user", content: prompt }
        ]
      }),
      signal: AbortSignal.timeout(120000)
    })

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.message?.content || ""
  }

  const generateResponse = await fetch(new URL("/api/copilot/generate", request.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: request.headers.get("cookie") || ""
    },
    body: JSON.stringify({
      chatSettings: json.chatSettings,
      provider: json.provider,
      customModelId: json.customModelId,
      messages: [
        {
          role: "system",
          content:
            "You generate strictly valid JSON for evidence-grounded literature review interfaces."
        },
        { role: "user", content: prompt }
      ]
    }),
    signal: AbortSignal.timeout(120000)
  })

  if (!generateResponse.ok) {
    throw new Error(modelHttpError("en", generateResponse.status))
  }

  const { content } = (await generateResponse.json()) as { content: string }
  return content
}

export async function POST(request: NextRequest) {
  try {
    const json = (await request.json()) as LiteratureReviewRequest
    const topic = json.topic?.trim()
    const locale = resolveLiteratureLocale(json.locale)

    if (!topic) {
      return NextResponse.json({ message: "Topic is required" }, { status: 400 })
    }
    if (!json.chatSettings || !json.provider) {
      return NextResponse.json(
        { message: "chatSettings and provider are required" },
        { status: 400 }
      )
    }

    const maxPapers = Math.min(Math.max(json.maxPapers || 18, 8), 50)
    const { papers: mergedPapers, poolSize, sourcesUsed, domains, queryPlan } =
      await fetchMergedEvidence(topic, maxPapers, locale)
    if (mergedPapers.length === 0) {
      return NextResponse.json(
        { message: noPapersMessage(locale) },
        { status: 404 }
      )
    }

    // Attach code WITHOUT re-ranking/dropping relevance-selected papers.
    // (Previously sorting by code presence discarded better literature matches.)
    const selectedPapers = await Promise.all(
      mergedPapers.map(async (paper, index) => ({
        ...paper,
        id: `P${index + 1}`,
        code: await findCodeRepository(paper, topic)
      }))
    )

    const prompt = buildSynthesisPrompt(
      topic,
      selectedPapers,
      json.contextNotes,
      domains,
      queryPlan.primaryEn,
      locale
    )
    let result = buildEvidenceSynthesisReview(
      topic,
      selectedPapers,
      undefined,
      locale
    )

    try {
      const content = await generateSynthesisContent(request, json, prompt)
      if (!content?.trim()) {
        result = buildEvidenceSynthesisReview(
          topic,
          selectedPapers,
          synthesisIssueEmpty(locale),
          locale
        )
      } else {
        try {
          const parsed = JSON.parse(extractJson(content))
          result = hasUnsupportedModelMetadata(parsed, selectedPapers)
            ? buildEvidenceSynthesisReview(
                topic,
                selectedPapers,
                synthesisIssueBadMeta(locale),
                locale
              )
            : parsed
        } catch (error: any) {
          result = buildEvidenceSynthesisReview(
            topic,
            selectedPapers,
            synthesisIssueBadJson(locale, error.message || "parse failed"),
            locale
          )
        }
      }
    } catch (error: any) {
      result = buildEvidenceSynthesisReview(
        topic,
        selectedPapers,
        synthesisIssueCallFailed(locale, error.message || "unknown error"),
        locale
      )
    }

    const sourceLabel = [...sourcesUsed, "GitHub Search"].join(" + ")

    return NextResponse.json({
      ...normalizeReviewResult(result, topic, selectedPapers, locale),
      domains,
      queryPlan,
      evidence: {
        retrievedAt: new Date().toISOString(),
        source: sourceLabel,
        papers: selectedPapers,
        stats: {
          selected: selectedPapers.length,
          poolSize,
          requested: maxPapers
        }
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Literature review generation failed" },
      { status: 500 }
    )
  }
}
