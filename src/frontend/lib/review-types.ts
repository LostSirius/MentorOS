/** Runtime Review types — aligned with docs/distill/schemas/handoff.ts */

export type ReviewLocale = "en" | "zh"

export type GateSeverity = "BLOCK" | "WARN" | "INFO" | "CLEAR"

export type GateResult = {
  id: string
  severity: GateSeverity
  message: string
  fixHint?: string
}

export type ChecklistSeverity = "CRITICAL" | "MAJOR" | "MINOR" | "INFO"

export type DecisionTendency = "accept" | "reject" | "borderline"

export type ReadinessLight = "red" | "yellow" | "green"

/** Five pre-submission dimensions (pre-submission-reviewer) */
export const REVIEW_DIMENSIONS = [
  "macro_logic",
  "writing_detail",
  "grammar",
  "latex_format",
  "figure_quality"
] as const

export type ReviewDimension = (typeof REVIEW_DIMENSIONS)[number]

export type ReviewDimensionScores = Partial<Record<ReviewDimension, number>>

/** Liang et al. review-outline structure (scientific-feedback) */
export type RejectReason = {
  title: string
  details: string[]
}

export type ScientificFeedbackOutline = {
  significanceNovelty: string[]
  acceptReasons: string[]
  rejectReasons: RejectReason[]
  suggestions: string[]
}

export type ReviewPerspective = {
  name: string
  strengths: string[]
  weaknesses: string[]
  questions: string[]
}

export type ReviewChecklistItem = {
  id: string
  severity: ChecklistSeverity
  detail: string
  /** Five-dimension tag when available */
  dimension?: string
  suggestion?: string
}

export type ResponseOutlineItem = {
  reviewPointId: string
  stance: "agree" | "partial" | "disagree"
  action: string
  /** Author marked as must-fix (HITL) */
  confirmed?: boolean
}

export type ReviewReport = {
  version: 1
  overall?: number
  decisionTendency?: DecisionTendency
  /** 1–10 scores per pre-submission dimension (for radar / bars) */
  dimensionScores?: ReviewDimensionScores
  /** Structured peer-review outline (Liang et al. / scientific-feedback) */
  feedbackOutline?: ScientificFeedbackOutline
  perspectives: ReviewPerspective[]
  checklist: ReviewChecklistItem[]
  responseOutline?: ResponseOutlineItem[]
  rankedWeaknesses?: string[]
  readiness?: ReadinessLight
  manuscriptExcerpt?: string
  locale: ReviewLocale
  gates: GateResult[]
  createdAt: string
}

export type ReviewSession = {
  version: 1
  current: ReviewReport | null
  /** Past runs for this archive session */
  history: ReviewReport[]
}

export const REVIEW_HISTORY_MAX = 8

export const CHECKLIST_SEVERITIES: ChecklistSeverity[] = [
  "CRITICAL",
  "MAJOR",
  "MINOR",
  "INFO"
]

export function emptyReviewSession(): ReviewSession {
  return { version: 1, current: null, history: [] }
}

export function computeReadiness(
  checklist: ReviewChecklistItem[]
): ReadinessLight {
  if (checklist.some(c => c.severity === "CRITICAL")) return "red"
  if (checklist.some(c => c.severity === "MAJOR")) return "yellow"
  return "green"
}

export function buildReviewGates(
  report: Omit<ReviewReport, "gates"> & { gates?: GateResult[] }
): GateResult[] {
  const gates: GateResult[] = []
  const zh = report.locale === "zh"
  const checklist = report.checklist || []
  const critical = checklist.filter(c => c.severity === "CRITICAL")
  const major = checklist.filter(c => c.severity === "MAJOR")

  if (!checklist.length && !(report.perspectives || []).length) {
    gates.push({
      id: "empty",
      severity: "INFO",
      message: zh ? "尚未运行审稿" : "No review run yet"
    })
  }

  if (critical.length) {
    gates.push({
      id: "g6-critical",
      severity: "BLOCK",
      message: zh
        ? `存在 ${critical.length} 条 CRITICAL — 投稿就绪灯为红`
        : `${critical.length} CRITICAL issue(s) — readiness is red`,
      fixHint: zh
        ? "先处理 CRITICAL，再考虑投稿；不要自动改正文"
        : "Resolve CRITICAL items before submission; do not auto-rewrite the paper"
    })
  } else if (major.length) {
    gates.push({
      id: "g6-major",
      severity: "WARN",
      message: zh
        ? `存在 ${major.length} 条 MAJOR — 就绪灯为黄`
        : `${major.length} MAJOR issue(s) — readiness is yellow`,
      fixHint: zh
        ? "确认必改项后再投稿"
        : "Confirm must-fix items before submitting"
    })
  }

  const pending = (report.responseOutline || []).filter(
    r => r.confirmed == null || r.confirmed === false
  )
  if ((report.responseOutline || []).length && pending.length) {
    gates.push({
      id: "hitl-response",
      severity: "WARN",
      message: zh
        ? `返修提纲尚有 ${pending.length} 条未确认`
        : `${pending.length} response outline item(s) unconfirmed`,
      fixHint: zh
        ? "在 Response 表中勾选必改项"
        : "Tick must-fix items in the Response table"
    })
  }

  if (gates.length === 0) {
    gates.push({
      id: "clear",
      severity: "CLEAR",
      message: zh ? "门禁通过（无 CRITICAL）" : "Gates clear (no CRITICAL)"
    })
  }

  return gates
}

export function emptyReviewReport(
  locale: ReviewLocale = "en",
  partial?: Partial<ReviewReport>
): ReviewReport {
  const checklist = Array.isArray(partial?.checklist) ? partial!.checklist! : []
  const perspectives = Array.isArray(partial?.perspectives)
    ? partial!.perspectives!
    : []
  const dimensionScores =
    partial?.dimensionScores || deriveDimensionScores(checklist)
  const base: Omit<ReviewReport, "gates"> = {
    version: 1,
    overall: partial?.overall,
    decisionTendency: partial?.decisionTendency,
    dimensionScores,
    feedbackOutline: partial?.feedbackOutline,
    perspectives,
    checklist,
    responseOutline: partial?.responseOutline || [],
    rankedWeaknesses: partial?.rankedWeaknesses || [],
    readiness: partial?.readiness || computeReadiness(checklist),
    manuscriptExcerpt: partial?.manuscriptExcerpt,
    locale: partial?.locale || locale,
    createdAt: partial?.createdAt || new Date().toISOString()
  }
  return {
    ...base,
    gates: buildReviewGates(base)
  }
}

/** Heuristic 1–10 scores from checklist severity when the model omits them */
export function deriveDimensionScores(
  checklist: ReviewChecklistItem[]
): ReviewDimensionScores {
  const scores: ReviewDimensionScores = {}
  for (const dim of REVIEW_DIMENSIONS) {
    const items = checklist.filter(
      c => (c.dimension || "macro_logic") === dim
    )
    if (!items.length) {
      scores[dim] = 7
      continue
    }
    let score = 10
    for (const item of items) {
      if (item.severity === "CRITICAL") score -= 3
      else if (item.severity === "MAJOR") score -= 2
      else if (item.severity === "MINOR") score -= 1
    }
    scores[dim] = Math.min(10, Math.max(1, score))
  }
  return scores
}

export function severityCounts(checklist: ReviewChecklistItem[]): Record<
  ChecklistSeverity,
  number
> {
  const counts: Record<ChecklistSeverity, number> = {
    CRITICAL: 0,
    MAJOR: 0,
    MINOR: 0,
    INFO: 0
  }
  for (const c of checklist) counts[c.severity] = (counts[c.severity] || 0) + 1
  return counts
}

export function reviewToMarkdown(report: ReviewReport): string {
  const lines = [
    `# Review · ${report.decisionTendency || "n/a"} · overall ${report.overall ?? "—"}`,
    "",
    `- Readiness: ${report.readiness || computeReadiness(report.checklist)}`,
    `- Locale: ${report.locale}`,
    `- Created: ${report.createdAt}`,
    ""
  ]
  if (report.dimensionScores) {
    lines.push("## Dimension scores", "")
    for (const dim of REVIEW_DIMENSIONS) {
      const v = report.dimensionScores[dim]
      if (v != null) lines.push(`- ${dim}: ${v}/10`)
    }
    lines.push("")
  }
  const fo = report.feedbackOutline
  if (fo) {
    lines.push("## Review outline (scientific feedback)", "")
    if (fo.significanceNovelty?.length) {
      lines.push("### 1. Significance and novelty", "")
      fo.significanceNovelty.forEach(s => lines.push(`- ${s}`))
      lines.push("")
    }
    if (fo.acceptReasons?.length) {
      lines.push("### 2. Potential reasons for acceptance", "")
      fo.acceptReasons.forEach(s => lines.push(`- ${s}`))
      lines.push("")
    }
    if (fo.rejectReasons?.length) {
      lines.push("### 3. Potential reasons for rejection", "")
      fo.rejectReasons.forEach((r, i) => {
        lines.push(`${i + 1}. **${r.title}**`)
        for (const d of r.details || []) lines.push(`   - ${d}`)
      })
      lines.push("")
    }
    if (fo.suggestions?.length) {
      lines.push("### 4. Suggestions for improvement", "")
      fo.suggestions.forEach(s => lines.push(`- ${s}`))
      lines.push("")
    }
  }
  if (report.rankedWeaknesses?.length) {
    lines.push("## Ranked weaknesses", "")
    report.rankedWeaknesses.forEach((w, i) => lines.push(`${i + 1}. ${w}`))
    lines.push("")
  }
  lines.push("## Checklist", "")
  for (const c of report.checklist) {
    lines.push(
      `- **${c.severity}** \`${c.id}\`${c.dimension ? ` [${c.dimension}]` : ""}: ${c.detail}`
    )
    if (c.suggestion) lines.push(`  - Fix: ${c.suggestion}`)
  }
  lines.push("", "## Perspectives", "")
  for (const p of report.perspectives) {
    lines.push(`### ${p.name}`, "")
    lines.push("Strengths:")
    for (const s of p.strengths) lines.push(`- ${s}`)
    lines.push("Weaknesses:")
    for (const w of p.weaknesses) lines.push(`- ${w}`)
    lines.push("Questions:")
    for (const q of p.questions) lines.push(`- ${q}`)
    lines.push("")
  }
  if (report.responseOutline?.length) {
    lines.push("## Response outline", "")
    for (const r of report.responseOutline) {
      lines.push(
        `- [${r.confirmed ? "x" : " "}] ${r.reviewPointId} · ${r.stance}: ${r.action}`
      )
    }
    lines.push("")
  }
  lines.push("## Gates", "")
  for (const g of report.gates) {
    lines.push(`- **${g.severity}** ${g.message}`)
  }
  return lines.join("\n")
}

export function isReviewReport(value: unknown): value is ReviewReport {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as ReviewReport).version === 1 &&
      Array.isArray((value as ReviewReport).checklist)
  )
}

export function isReviewSession(value: unknown): value is ReviewSession {
  if (!value || typeof value !== "object") return false
  const v = value as ReviewSession & { comments?: unknown; checklist?: unknown }
  // Discriminate from WritingSession (which has comments[])
  if (Array.isArray(v.comments)) return false
  if (v.version !== 1) return false
  if (v.current && isReviewReport(v.current)) return true
  if (Array.isArray(v.history) && v.history.some(isReviewReport)) return true
  return (
    "current" in v &&
    Array.isArray(v.history) &&
    !Array.isArray(v.comments)
  )
}

export function normalizeReviewSession(raw: unknown): ReviewSession {
  if (!raw) return emptyReviewSession()
  if (isReviewSession(raw)) {
    const current = raw.current
      ? emptyReviewReport(raw.current.locale || "en", raw.current)
      : null
    const history = Array.isArray(raw.history)
      ? raw.history
          .filter(isReviewReport)
          .map(r => emptyReviewReport(r.locale || "en", r))
          .slice(0, REVIEW_HISTORY_MAX)
      : []
    return { version: 1, current, history }
  }
  if (isReviewReport(raw)) {
    const current = emptyReviewReport(raw.locale || "en", raw)
    return { version: 1, current, history: [] }
  }
  return emptyReviewSession()
}

export function pushReviewReport(
  session: ReviewSession,
  report: ReviewReport
): ReviewSession {
  const prev = session.current
  const history = prev
    ? [prev, ...session.history].slice(0, REVIEW_HISTORY_MAX)
    : session.history
  return { version: 1, current: report, history }
}

export function filterChecklist(
  items: ReviewChecklistItem[],
  severity: ChecklistSeverity | "ALL"
): ReviewChecklistItem[] {
  if (severity === "ALL") return items
  return items.filter(i => i.severity === severity)
}
