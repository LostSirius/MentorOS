/** Runtime Writing Coach types — aligned with docs/distill/schemas/handoff.ts */

export type WritingLocale = "en" | "zh"

export type GateSeverity = "BLOCK" | "WARN" | "INFO" | "CLEAR"

export type GateResult = {
  id: string
  severity: GateSeverity
  message: string
  fixHint?: string
}

export type EvidenceLevel = "L0" | "L1" | "L2" | "L3"

export type WritingMode =
  | "outline"
  | "draft_section"
  | "intro"
  | "polish"
  | "nature_style"
  | "revise_feedback"
  | "revise_scoped"

export type PublicationMode = "draft" | "final"

export type StyleTier = "academic" | "ml_conference" | "nature_like"

export type EvidenceMapItem = {
  id: string
  source: string
  level: EvidenceLevel
  supports: string
  cannotSupport: string
}

export type SemanticDiff = {
  before: string
  after: string
  reason: string
  /** Links to a review comment id when mode is revise_feedback */
  commentId?: string
  accepted?: boolean
}

/** Point-by-point review / advisor comment for revision */
export type ReviewCommentItem = {
  id: string
  text: string
  stance?: "agree" | "partial" | "disagree"
  action?: string
  status?: "pending" | "applied" | "skipped"
}

export type ScopedReviseOptions = {
  /** Exact span to rewrite; empty = whole draft */
  targetText?: string
  /** Free-form instruction, e.g. "shorten and clarify contribution 2" */
  instruction?: string
  /** Do not change scientific claims / numbers / contribution statements */
  preserveClaims?: boolean
}

export type WritingBundle = {
  version: 1
  mode: WritingMode
  section?: string
  content: string
  evidenceMap?: EvidenceMapItem[]
  pendingSemanticDiffs?: SemanticDiff[]
  /** Present after revise_feedback */
  reviewResponses?: ReviewCommentItem[]
  publicationMode: PublicationMode
  styleTier: StyleTier
  locale: WritingLocale
  /**
   * Max prose length in units of `resolveProseCountUnit` (words for EN,
   * non-whitespace chars for ZH). Omit / null / 0 = no limit.
   */
  wordLimit?: number | null
  gates: GateResult[]
  createdAt: string
}

export type WritingVersion = {
  id: string
  label: string
  createdAt: string
  bundle: WritingBundle
}

/** Current draft + snapshot history for A/B compare */
export type WritingSession = {
  version: 1
  current: WritingBundle | null
  history: WritingVersion[]
  comments: ReviewCommentItem[]
}

export const WRITING_MODES: WritingMode[] = [
  "outline",
  "draft_section",
  "intro",
  "polish",
  "nature_style",
  "revise_feedback",
  "revise_scoped"
]

/** From-scratch drafting (Write module) */
export const DRAFT_WRITING_MODES: WritingMode[] = [
  "outline",
  "draft_section",
  "intro",
  "nature_style"
]

/** Existing-draft polish / revise (Polish module) */
export const POLISH_WRITING_MODES: WritingMode[] = [
  "polish",
  "revise_feedback",
  "revise_scoped"
]

export const WRITING_HISTORY_MAX = 12

/** Common venue-ish caps; 0 = unlimited */
export const WORD_LIMIT_PRESETS = [0, 150, 250, 500, 1000, 2000, 4000, 8000] as const

export type ProseCountUnit = "words" | "chars"

export function resolveProseCountUnit(
  locale: WritingLocale,
  forceEnglish?: boolean
): ProseCountUnit {
  if (forceEnglish || locale === "en") return "words"
  return "chars"
}

/** EN: words (+ each CJK char as one unit). ZH: non-whitespace characters. */
export function countProseUnits(
  text: string,
  unit: ProseCountUnit
): number {
  const raw = String(text || "")
  if (!raw.trim()) return 0
  if (unit === "chars") {
    return raw.replace(/\s+/g, "").length
  }
  const cjk = raw.match(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g)
  const cjkCount = cjk?.length || 0
  const withoutCjk = raw.replace(
    /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g,
    " "
  )
  const words = withoutCjk
    .trim()
    .match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)
  return (words?.length || 0) + cjkCount
}

export function normalizeWordLimit(raw: unknown): number | null {
  if (raw == null || raw === "") return null
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(n, 200000)
}

export const WRITING_SECTIONS = [
  "abstract",
  "introduction",
  "related_work",
  "method",
  "experiments",
  "results",
  "discussion",
  "conclusion"
] as const

export type WritingSectionId = (typeof WRITING_SECTIONS)[number]

const PLACEHOLDER_RE =
  /\[citation needed\]|\[待验证\]|\[作者补充\]|\[TODO\]|\[FIXME\]|\[insert\s+[^\]]+\]|待补充|作者补充/gi

const FAKE_CITATION_RE =
  /\b(example\.com|doi\.org\/10\.0000|John Doe|Jane Doe|et al\.\s*\(20XX\)|Author\s+et\s+al\.)\b/gi

const AI_TONE_RE =
  /\b(delve into|tapestry|landscape of|it is worth noting|in today's world|leverage|utilize|robust framework|groundbreaking|revolutionary|embark on|shed light on)\b|值得注意的是|在当今时代|深入探讨|赋能|赋能于/gi

const RESULT_CLAIM_RE =
  /\b(we (achieved|obtained|got|report)|accuracy of|F1[=:]|AUC[=:]|\d+(\.\d+)?\s*%\s*(accuracy|F1|recall|precision))\b|准确率达到|我们取得了|实验结果表[明示]/gi

export function emptyWritingBundle(
  locale: WritingLocale = "en",
  partial?: Partial<WritingBundle>
): WritingBundle {
  const base: Omit<WritingBundle, "gates"> = {
    version: 1,
    mode: partial?.mode || "outline",
    section: partial?.section,
    content: partial?.content || "",
    evidenceMap: partial?.evidenceMap || [],
    pendingSemanticDiffs: partial?.pendingSemanticDiffs || [],
    reviewResponses: partial?.reviewResponses || [],
    publicationMode: partial?.publicationMode || "draft",
    styleTier: partial?.styleTier || "academic",
    locale,
    wordLimit: normalizeWordLimit(partial?.wordLimit),
    createdAt: new Date().toISOString()
  }
  return {
    ...base,
    ...partial,
    version: 1,
    locale,
    createdAt: partial?.createdAt || base.createdAt,
    gates: buildWritingGates({
      ...base,
      ...partial,
      version: 1,
      locale,
      createdAt: partial?.createdAt || base.createdAt,
      gates: []
    })
  }
}

export function buildWritingGates(
  bundle: Omit<WritingBundle, "gates"> & { gates?: GateResult[] },
  opts?: { hasExperimentResults?: boolean }
): GateResult[] {
  const gates: GateResult[] = []
  const content = bundle.content || ""
  const hasResults = Boolean(opts?.hasExperimentResults)

  if (PLACEHOLDER_RE.test(content)) {
    gates.push({
      id: "g1-placeholder",
      severity: "BLOCK",
      message:
        bundle.locale === "zh"
          ? "正文含占位括号/待补充标记（G1）"
          : "Prose contains placeholder brackets (G1)",
      fixHint:
        bundle.locale === "zh"
          ? "删除占位符或补齐可核验引用后再导出"
          : "Remove placeholders or add verifiable citations before export"
    })
  }
  PLACEHOLDER_RE.lastIndex = 0

  if (FAKE_CITATION_RE.test(content)) {
    gates.push({
      id: "g1-fake-citation",
      severity: "BLOCK",
      message:
        bundle.locale === "zh"
          ? "检测到疑似伪造/占位引用（G1）"
          : "Likely fake/placeholder citations detected (G1)",
      fixHint:
        bundle.locale === "zh"
          ? "仅使用文献模块 paper id / DOI / 用户材料中的出处"
          : "Use only LiteraturePacket paper ids, DOIs, or user-provided sources"
    })
  }
  FAKE_CITATION_RE.lastIndex = 0

  if (
    bundle.publicationMode === "final" &&
    !hasResults &&
    RESULT_CLAIM_RE.test(content) &&
    (bundle.section === "results" ||
      bundle.section === "experiments" ||
      bundle.mode === "draft_section" ||
      bundle.mode === "nature_style")
  ) {
    gates.push({
      id: "g2-provenance",
      severity: "BLOCK",
      message:
        bundle.locale === "zh"
          ? "Final 模式出现结果声称，但无实验 provenance（G2/G5）"
          : "Final mode has result claims without experiment provenance (G2/G5)",
      fixHint:
        bundle.locale === "zh"
          ? "切换 Draft 模式，或先在实验模块粘贴 runLog/结果表"
          : "Switch to Draft mode, or attach run logs/tables in Experiment first"
    })
  }
  RESULT_CLAIM_RE.lastIndex = 0

  const aiHits = content.match(AI_TONE_RE)
  if (aiHits && aiHits.length >= 3) {
    gates.push({
      id: "g7-ai-tone",
      severity: "WARN",
      message:
        bundle.locale === "zh"
          ? `AI 腔套话偏多（约 ${aiHits.length} 处，G7）`
          : `AI-tone stock phrases dense (~${aiHits.length} hits, G7)`,
      fixHint:
        bundle.locale === "zh"
          ? "运行润色模式并确认语义 diff"
          : "Run polish mode and confirm semantic diffs"
    })
  }
  AI_TONE_RE.lastIndex = 0

  if (
    (bundle.mode === "polish" ||
      bundle.mode === "revise_feedback" ||
      bundle.mode === "revise_scoped") &&
    (bundle.pendingSemanticDiffs || []).some(d => d.accepted == null)
  ) {
    gates.push({
      id: "g7-pending-diff",
      severity: "WARN",
      message:
        bundle.locale === "zh"
          ? "存在未确认的语义改动（G7）"
          : "Unresolved semantic diffs pending confirmation (G7)",
      fixHint:
        bundle.locale === "zh"
          ? "逐条接受或拒绝后再定稿"
          : "Accept or reject each diff before finalizing"
    })
  }

  if (
    bundle.mode === "revise_feedback" &&
    (bundle.reviewResponses || []).some(r => r.status === "pending")
  ) {
    gates.push({
      id: "feedback-pending",
      severity: "WARN",
      message:
        bundle.locale === "zh"
          ? "仍有未处理的审稿意见条目"
          : "Some review comments are still pending"
    })
  }

  if (!content.trim()) {
    gates.push({
      id: "empty",
      severity: "INFO",
      message:
        bundle.locale === "zh" ? "尚无正文" : "No prose generated yet"
    })
  }

  const limit = normalizeWordLimit(bundle.wordLimit)
  if (limit && content.trim()) {
    const unit = resolveProseCountUnit(bundle.locale)
    const count = countProseUnits(content, unit)
    const unitLabel =
      bundle.locale === "zh"
        ? unit === "chars"
          ? "字"
          : "词"
        : unit === "chars"
          ? "chars"
          : "words"
    if (count > limit) {
      gates.push({
        id: "g-length-over",
        severity: bundle.publicationMode === "final" ? "BLOCK" : "WARN",
        message:
          bundle.locale === "zh"
            ? `正文超出字数上限（${count} / ${limit} ${unitLabel}）`
            : `Prose exceeds length cap (${count} / ${limit} ${unitLabel})`,
        fixHint:
          bundle.locale === "zh"
            ? "缩短正文，或提高上限；Final 模式下超限将阻断定稿"
            : "Shorten the prose or raise the limit; Final mode blocks when over"
      })
    } else if (count >= Math.floor(limit * 0.9)) {
      gates.push({
        id: "g-length-near",
        severity: "WARN",
        message:
          bundle.locale === "zh"
            ? `接近字数上限（${count} / ${limit} ${unitLabel}）`
            : `Near length cap (${count} / ${limit} ${unitLabel})`,
        fixHint:
          bundle.locale === "zh"
            ? "生成时请要求模型控制篇幅"
            : "Ask the model to keep within the remaining budget"
      })
    }
  }

  if (gates.length === 0) {
    gates.push({
      id: "clear",
      severity: "CLEAR",
      message: bundle.locale === "zh" ? "门禁通过" : "Gates clear"
    })
  }

  return gates
}

export function writingToMarkdown(bundle: WritingBundle): string {
  const lines = [
    `# Writing · ${bundle.mode}${bundle.section ? ` · ${bundle.section}` : ""}`,
    "",
    `- Publication: ${bundle.publicationMode}`,
    `- Style: ${bundle.styleTier}`,
    `- Locale: ${bundle.locale}`,
    bundle.wordLimit
      ? `- Length cap: ${bundle.wordLimit} ${resolveProseCountUnit(bundle.locale)}`
      : null,
    `- Created: ${bundle.createdAt}`,
    "",
    "## Content",
    "",
    bundle.content || "(empty)",
    ""
  ].filter(Boolean) as string[]
  if (bundle.evidenceMap?.length) {
    lines.push("## Evidence Map", "")
    for (const e of bundle.evidenceMap) {
      lines.push(
        `- **${e.id}** [${e.level}] ${e.source}`,
        `  - Supports: ${e.supports}`,
        `  - Cannot support: ${e.cannotSupport}`
      )
    }
    lines.push("")
  }
  if (bundle.pendingSemanticDiffs?.length) {
    lines.push("## Semantic Diffs", "")
    for (const d of bundle.pendingSemanticDiffs) {
      lines.push(
        `- [${d.accepted === true ? "accepted" : d.accepted === false ? "rejected" : "pending"}]${d.commentId ? ` (${d.commentId})` : ""} ${d.reason}`,
        `  - before: ${d.before}`,
        `  - after: ${d.after}`
      )
    }
    lines.push("")
  }
  if (bundle.reviewResponses?.length) {
    lines.push("## Review Responses", "")
    for (const r of bundle.reviewResponses) {
      lines.push(
        `- **${r.id}** [${r.status || "pending"}] stance=${r.stance || "—"}`,
        `  - comment: ${r.text}`,
        `  - action: ${r.action || "—"}`
      )
    }
    lines.push("")
  }
  if (bundle.gates?.length) {
    lines.push("## Gates", "")
    for (const g of bundle.gates) {
      lines.push(`- **${g.severity}** ${g.id}: ${g.message}`)
    }
  }
  return lines.join("\n")
}

export function applyAcceptedDiffs(
  content: string,
  diffs: SemanticDiff[]
): string {
  let next = content
  for (const d of diffs) {
    if (d.accepted === true && d.before && next.includes(d.before)) {
      next = next.replace(d.before, d.after)
    }
  }
  return next
}

/** Apply scoped rewrite: replace target span, or whole doc if no target. */
export function applyScopedRewrite(
  content: string,
  targetText: string | undefined,
  rewritten: string
): string {
  const target = (targetText || "").trim()
  if (!target) return rewritten
  if (content.includes(target)) return content.replace(target, rewritten)
  return rewritten
}

export function emptyWritingSession(): WritingSession {
  return { version: 1, current: null, history: [], comments: [] }
}

export function isWritingBundle(value: unknown): value is WritingBundle {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as WritingBundle).version === 1 &&
      typeof (value as WritingBundle).content === "string" &&
      typeof (value as WritingBundle).mode === "string" &&
      !Array.isArray((value as { history?: unknown }).history)
  )
}

export function isWritingSession(value: unknown): value is WritingSession {
  if (!value || typeof value !== "object") return false
  const v = value as WritingSession & { comments?: unknown }
  return (
    v.version === 1 &&
    Array.isArray(v.history) &&
    Array.isArray(v.comments) &&
    !("checklist" in v && Array.isArray((v as { checklist?: unknown }).checklist))
  )
}

/** Accept legacy WritingBundle or WritingSession from archives. */
export function normalizeWritingSession(raw: unknown): WritingSession {
  if (!raw) return emptyWritingSession()
  if (isWritingSession(raw)) {
    return {
      version: 1,
      current: raw.current || null,
      history: Array.isArray(raw.history) ? raw.history.slice(0, WRITING_HISTORY_MAX) : [],
      comments: Array.isArray(raw.comments) ? raw.comments : []
    }
  }
  if (isWritingBundle(raw)) {
    return {
      version: 1,
      current: raw,
      history: [],
      comments: []
    }
  }
  return emptyWritingSession()
}

export function pushWritingSnapshot(
  session: WritingSession,
  bundle: WritingBundle,
  label?: string
): WritingSession {
  const snap: WritingVersion = {
    id: `wv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    label: label?.trim() || defaultVersionLabel(bundle),
    createdAt: new Date().toISOString(),
    bundle: { ...bundle }
  }
  return {
    ...session,
    current: bundle,
    history: [snap, ...session.history].slice(0, WRITING_HISTORY_MAX)
  }
}

function defaultVersionLabel(bundle: WritingBundle): string {
  const stamp = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
  return `${bundle.mode} · ${stamp}`
}

/** Parse pasted review comments (numbered / bulleted / blank-line separated). */
export function parseReviewComments(raw: string): ReviewCommentItem[] {
  const text = String(raw || "").trim()
  if (!text) return []
  const chunks = text
    .split(/\n(?=\s*(?:\d+[\.\)]\s+|[-*•]\s+|R\d+[:\.]?\s+))/g)
    .map(s => s.trim())
    .filter(Boolean)
  const items = (chunks.length > 1 ? chunks : text.split(/\n\s*\n/)).map(
    (chunk, i) => {
      const cleaned = chunk
        .replace(/^\s*(?:\d+[\.\)]\s+|[-*•]\s+|R\d+[:\.]?\s+)/i, "")
        .trim()
      return {
        id: `R${i + 1}`,
        text: cleaned || chunk.trim(),
        status: "pending" as const
      }
    }
  )
  return items.filter(c => c.text).slice(0, 30)
}
