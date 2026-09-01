/**
 * Paper Overview — aggregate Material Passport (docs/distill/modules/overview.md).
 * Aggregation only: no new evidence invented.
 */

import type { LiteratureReviewResult } from "@/context/copilot-context"
import type { ExperimentRecord } from "@/lib/experiment-types"
import type { FigureSession } from "@/lib/figure-types"
import type { IdeaCard } from "@/lib/idea-types"
import type { ResearchModuleId } from "@/lib/research-modules"
import type { ReviewSession } from "@/lib/review-types"
import type { WritingSession } from "@/lib/writing-types"

export type OverviewLocale = "en" | "zh"

export type GateSeverity = "BLOCK" | "WARN" | "INFO" | "CLEAR"

export type ModulePipelineStatus =
  | "empty"
  | "partial"
  | "ready"
  | "blocked"

export type PassportItem = {
  id: string
  kind: string
  title: string
  createdAt: string
  gateSummary: GateSeverity
  moduleId: ResearchModuleId
}

export type ScoreChip = {
  id: string
  label: string
  value: string
  moduleId: ResearchModuleId
}

export type GapItem = {
  id: string
  severity: GateSeverity
  message: string
  moduleId: ResearchModuleId
  cta?: ResearchModuleId
}

export type OverviewState = {
  version: 1
  modules: {
    literature?: { status: ModulePipelineStatus; packetId?: string }
    idea?: { status: ModulePipelineStatus; cardId?: string }
    experiment?: { status: ModulePipelineStatus; recordId?: string }
    writing?: { status: ModulePipelineStatus }
    polish?: { status: ModulePipelineStatus }
    figures?: { status: ModulePipelineStatus }
    review?: { status: ModulePipelineStatus }
    overview?: { status: ModulePipelineStatus }
  }
  passport: PassportItem[]
  scores: ScoreChip[]
  gaps: GapItem[]
  readiness: "red" | "yellow" | "green"
  nextActions: { label: string; moduleId: ResearchModuleId }[]
  locale: OverviewLocale
  notes?: string
  updatedAt: string
}

/** Workflow order for the pipeline strip (not left-nav order). */
export const OVERVIEW_PIPELINE: ResearchModuleId[] = [
  "literature",
  "idea",
  "experiment",
  "writing",
  "figures",
  "review",
  "polish",
  "overview"
]

export type OverviewInputs = {
  literatureReview: LiteratureReviewResult | null
  ideaCard: IdeaCard | null
  ideaCandidatesCount?: number
  experimentRecord: ExperimentRecord | null
  writingSession: WritingSession | null
  figureSession: FigureSession | null
  reviewSession: ReviewSession | null
  locale?: OverviewLocale
  notes?: string
}

function worstGate(
  severities: GateSeverity[]
): GateSeverity {
  if (severities.includes("BLOCK")) return "BLOCK"
  if (severities.includes("WARN")) return "WARN"
  if (severities.includes("INFO")) return "INFO"
  if (severities.includes("CLEAR")) return "CLEAR"
  return "INFO"
}

function writingHasPolish(session: WritingSession | null): boolean {
  if (!session?.current && !session?.history?.length) return false
  const modes = [
    session.current?.mode,
    ...(session.history || []).map(h => h.bundle?.mode)
  ]
  return modes.some(
    m =>
      m === "polish" ||
      m === "revise_feedback" ||
      m === "revise_scoped"
  )
}

function writingHasDraft(session: WritingSession | null): boolean {
  return Boolean(session?.current?.content?.trim() || session?.history?.length)
}

export function buildOverviewState(input: OverviewInputs): OverviewState {
  const locale: OverviewLocale =
    input.locale ||
    (input.ideaCard?.locale === "zh" ||
    input.reviewSession?.current?.locale === "zh"
      ? "zh"
      : "en")
  const zh = locale === "zh"
  const passport: PassportItem[] = []
  const scores: ScoreChip[] = []
  const gaps: GapItem[] = []
  const modules: OverviewState["modules"] = {}

  // —— Literature ——
  const lit = input.literatureReview
  if (lit) {
    const paperN = lit.papers?.length || 0
    const lim = lit.quality?.limitations?.length || 0
    modules.literature = {
      status: paperN > 0 ? "ready" : "partial",
      packetId: lit.topic?.slice(0, 48)
    }
    passport.push({
      id: "lit",
      kind: "LiteraturePacket",
      title: lit.topic || (zh ? "文献包" : "Literature packet"),
      createdAt: lit.evidence?.retrievedAt || new Date().toISOString(),
      gateSummary: lim > 3 ? "WARN" : "CLEAR",
      moduleId: "literature"
    })
    if (lit.quality?.topicRelevanceEstimate != null) {
      scores.push({
        id: "lit-rel",
        label: zh ? "文献相关度" : "Lit. relevance",
        value: `${Math.round(lit.quality.topicRelevanceEstimate * 100) / 100}`,
        moduleId: "literature"
      })
    }
    if (lit.quality?.codeCoverage != null) {
      scores.push({
        id: "lit-code",
        label: zh ? "代码覆盖" : "Code coverage",
        value: `${Math.round(lit.quality.codeCoverage * 100)}%`,
        moduleId: "literature"
      })
    }
    if (!(lit.review?.gaps || []).length) {
      gaps.push({
        id: "gap-lit-gaps",
        severity: "INFO",
        message: zh ? "文献综述缺少明确 research gaps" : "Literature review has no explicit gaps",
        moduleId: "literature",
        cta: "literature"
      })
    }
  } else {
    modules.literature = { status: "empty" }
    gaps.push({
      id: "gap-lit",
      severity: "WARN",
      message: zh ? "尚未完成文献调研" : "Literature research not started",
      moduleId: "literature",
      cta: "literature"
    })
  }

  // —— Idea ——
  const idea = input.ideaCard
  if (idea) {
    const blocked = (idea.gates || []).some(g => g.severity === "BLOCK")
    const warned = (idea.gates || []).some(g => g.severity === "WARN")
    modules.idea = {
      status: blocked ? "blocked" : "ready",
      cardId: idea.id || idea.candidateId
    }
    passport.push({
      id: "idea",
      kind: "IdeaCard",
      title: idea.title || idea.oneLiner || "Idea",
      createdAt: idea.createdAt,
      gateSummary: worstGate(
        (idea.gates || []).map(g => g.severity as GateSeverity)
      ),
      moduleId: "idea"
    })
    if (idea.scores) {
      const vals = Object.values(idea.scores)
        .map(d => (d && typeof d.score === "number" ? d.score : null))
        .filter((n): n is number => n != null)
      if (vals.length) {
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length
        scores.push({
          id: "idea-avg",
          label: zh ? "Idea 五维均分" : "Idea 5D avg",
          value: `${Math.round(avg * 10) / 10}/5`,
          moduleId: "idea"
        })
      }
      for (const [k, v] of Object.entries(idea.scores)) {
        if (v && typeof v.score === "number") {
          scores.push({
            id: `idea-${k}`,
            label: k,
            value: `${v.score}/5`,
            moduleId: "idea"
          })
        }
      }
    }
    if (!(idea.researchQuestions || []).length) {
      gaps.push({
        id: "gap-rq",
        severity: "BLOCK",
        message: zh ? "Idea 缺少可证伪研究问题（RQ）" : "Idea missing falsifiable RQs",
        moduleId: "idea",
        cta: "idea"
      })
    }
    if (idea.fatalFlaws?.length) {
      gaps.push({
        id: "gap-fatal",
        severity: "BLOCK",
        message: zh
          ? `存在 ${idea.fatalFlaws.length} 条致命缺陷记录`
          : `${idea.fatalFlaws.length} fatal flaw(s) recorded`,
        moduleId: "idea",
        cta: "idea"
      })
    }
    if (blocked || warned) {
      for (const g of idea.gates || []) {
        if (g.severity === "BLOCK" || g.severity === "WARN") {
          gaps.push({
            id: `idea-gate-${g.id}`,
            severity: g.severity as GateSeverity,
            message: g.message,
            moduleId: "idea",
            cta: "idea"
          })
        }
      }
    }
  } else {
    modules.idea = {
      status: (input.ideaCandidatesCount || 0) > 0 ? "partial" : "empty"
    }
    gaps.push({
      id: "gap-idea",
      severity: "WARN",
      message: zh ? "尚未确认 IdeaCard" : "No IdeaCard confirmed yet",
      moduleId: "idea",
      cta: "idea"
    })
  }

  // —— Experiment ——
  const exp = input.experimentRecord
  if (exp) {
    const blocked = (exp.gates || []).some(g => g.severity === "BLOCK")
    modules.experiment = {
      status: blocked
        ? "blocked"
        : exp.status === "interpreted" || exp.status === "results_attached"
          ? "ready"
          : "partial",
      recordId: exp.ideaId || exp.createdAt
    }
    passport.push({
      id: "exp",
      kind: "ExperimentRecord",
      title: zh
        ? `实验 · ${exp.status}`
        : `Experiment · ${exp.status}`,
      createdAt: exp.updatedAt || exp.createdAt || new Date().toISOString(),
      gateSummary: worstGate(
        (exp.gates || []).map(g => g.severity as GateSeverity)
      ),
      moduleId: "experiment"
    })
    const hasResults =
      (exp.runLogs || []).some(x => String(x || "").trim()) ||
      (exp.resultTables || []).some(x => String(x || "").trim())
    if (!hasResults) {
      gaps.push({
        id: "gap-results",
        severity: "WARN",
        message: zh ? "实验尚无运行日志/结果表" : "No run logs / result tables yet",
        moduleId: "experiment",
        cta: "experiment"
      })
    }
    for (const g of exp.gates || []) {
      if (g.severity === "BLOCK" || g.severity === "WARN") {
        gaps.push({
          id: `exp-gate-${g.id}`,
          severity: g.severity as GateSeverity,
          message: g.message,
          moduleId: "experiment",
          cta: "experiment"
        })
      }
    }
  } else {
    modules.experiment = { status: "empty" }
    gaps.push({
      id: "gap-exp",
      severity: "INFO",
      message: zh ? "尚未设计实验" : "Experiment not started",
      moduleId: "experiment",
      cta: "experiment"
    })
  }

  // —— Writing ——
  const writing = input.writingSession
  const draftReady = writingHasDraft(writing)
  if (draftReady && writing?.current) {
    const b = writing.current
    const blocked = (b.gates || []).some(g => g.severity === "BLOCK")
    modules.writing = {
      status: blocked ? "blocked" : b.content?.trim() ? "ready" : "partial"
    }
    passport.push({
      id: "writing",
      kind: "WritingBundle",
      title: zh
        ? `撰写 · ${b.mode}${b.section ? ` · ${b.section}` : ""}`
        : `Writing · ${b.mode}${b.section ? ` · ${b.section}` : ""}`,
      createdAt: b.createdAt,
      gateSummary: worstGate(
        (b.gates || []).map(g => g.severity as GateSeverity)
      ),
      moduleId: "writing"
    })
    for (const g of b.gates || []) {
      if (g.severity === "BLOCK" || g.severity === "WARN") {
        gaps.push({
          id: `write-gate-${g.id}`,
          severity: g.severity as GateSeverity,
          message: g.message,
          moduleId: "writing",
          cta: "writing"
        })
      }
    }
  } else if (draftReady) {
    // History exists but current cleared — still partial, not empty
    const hist = writing?.history?.[0]
    modules.writing = { status: "partial" }
    if (hist?.bundle) {
      passport.push({
        id: "writing-hist",
        kind: "WritingBundle",
        title: zh
          ? `撰写历史 · ${hist.label || hist.bundle.mode}`
          : `Writing history · ${hist.label || hist.bundle.mode}`,
        createdAt: hist.createdAt || hist.bundle.createdAt,
        gateSummary: worstGate(
          (hist.bundle.gates || []).map(g => g.severity as GateSeverity)
        ),
        moduleId: "writing"
      })
    }
  } else {
    modules.writing = { status: "empty" }
    gaps.push({
      id: "gap-writing",
      severity: "WARN",
      message: zh ? "尚无撰写正文" : "No drafting manuscript yet",
      moduleId: "writing",
      cta: "writing"
    })
  }

  // —— Figures ——
  const figs = input.figureSession?.figures || []
  if (figs.length) {
    const anyBlock = figs.some(f =>
      (f.gates || []).some(g => g.severity === "BLOCK")
    )
    modules.figures = { status: anyBlock ? "blocked" : "ready" }
    passport.push({
      id: "figures",
      kind: "FigureSet",
      title: zh ? `图表 ×${figs.length}` : `Figures ×${figs.length}`,
      createdAt: figs[0]?.createdAt || new Date().toISOString(),
      gateSummary: anyBlock
        ? "BLOCK"
        : figs.some(f => (f.gates || []).some(g => g.severity === "WARN"))
          ? "WARN"
          : "CLEAR",
      moduleId: "figures"
    })
  } else {
    modules.figures = { status: "empty" }
    gaps.push({
      id: "gap-figures",
      severity: "INFO",
      message: zh ? "尚未生成图表规格" : "No figure specs yet",
      moduleId: "figures",
      cta: "figures"
    })
  }

  // —— Review ——
  const review = input.reviewSession?.current
  if (review) {
    const blocked =
      review.readiness === "red" ||
      (review.gates || []).some(g => g.severity === "BLOCK") ||
      (review.checklist || []).some(c => c.severity === "CRITICAL")
    modules.review = { status: blocked ? "blocked" : "ready" }
    passport.push({
      id: "review",
      kind: "ReviewReport",
      title: zh
        ? `审稿 · ${review.decisionTendency || "n/a"} · ${review.overall ?? "—"}/10`
        : `Review · ${review.decisionTendency || "n/a"} · ${review.overall ?? "—"}/10`,
      createdAt: review.createdAt,
      gateSummary: blocked
        ? "BLOCK"
        : review.readiness === "yellow"
          ? "WARN"
          : "CLEAR",
      moduleId: "review"
    })
    if (review.overall != null) {
      scores.push({
        id: "review-overall",
        label: zh ? "审稿 Overall" : "Review overall",
        value: `${review.overall}/10`,
        moduleId: "review"
      })
    }
    const critical = (review.checklist || []).filter(
      c => c.severity === "CRITICAL"
    )
    if (critical.length) {
      gaps.push({
        id: "gap-critical",
        severity: "BLOCK",
        message: zh
          ? `${critical.length} 条 CRITICAL 未清`
          : `${critical.length} CRITICAL item(s) open`,
        moduleId: "review",
        cta: "review"
      })
    }
    const unconfirmed = (review.responseOutline || []).filter(
      r => !r.confirmed
    )
    if (unconfirmed.length) {
      gaps.push({
        id: "gap-response",
        severity: "WARN",
        message: zh
          ? `${unconfirmed.length} 条返修提纲未确认`
          : `${unconfirmed.length} response item(s) unconfirmed`,
        moduleId: "review",
        cta: "review"
      })
    }
  } else {
    modules.review = { status: "empty" }
    gaps.push({
      id: "gap-review",
      severity: "INFO",
      message: zh ? "尚未运行预投稿审稿" : "Pre-submission review not run",
      moduleId: "review",
      cta: "review"
    })
  }

  // —— Polish ——
  if (writingHasPolish(writing)) {
    modules.polish = { status: "ready" }
    passport.push({
      id: "polish",
      kind: "PolishBundle",
      title: zh ? "润色/改稿记录" : "Polish / revise history",
      createdAt:
        writing?.current?.createdAt || new Date().toISOString(),
      gateSummary: "CLEAR",
      moduleId: "polish"
    })
  } else {
    modules.polish = { status: draftReady ? "partial" : "empty" }
    if (draftReady) {
      gaps.push({
        id: "gap-polish",
        severity: "INFO",
        message: zh
          ? "已有初稿，可进入润色/返修"
          : "Draft exists — polish / revise available",
        moduleId: "polish",
        cta: "polish"
      })
    }
  }

  // —— Overview self ——
  const hasAny = passport.length > 0
  modules.overview = { status: hasAny ? "ready" : "empty" }

  const readiness: OverviewState["readiness"] = gaps.some(
    g => g.severity === "BLOCK"
  )
    ? "red"
    : gaps.some(g => g.severity === "WARN")
      ? "yellow"
      : hasAny
        ? "green"
        : "yellow"

  // Next actions: first BLOCK/WARN gaps, else next empty module in pipeline
  const nextActions: OverviewState["nextActions"] = []
  const seen = new Set<string>()
  for (const g of gaps) {
    if (
      (g.severity === "BLOCK" || g.severity === "WARN") &&
      g.cta &&
      !seen.has(g.cta)
    ) {
      seen.add(g.cta)
      nextActions.push({
        label: g.message,
        moduleId: g.cta
      })
    }
    if (nextActions.length >= 3) break
  }
  if (nextActions.length < 3) {
    for (const id of OVERVIEW_PIPELINE) {
      if (id === "overview") continue
      const st = modules[id as keyof typeof modules]?.status
      if ((st === "empty" || st === "partial") && !seen.has(id)) {
        seen.add(id)
        nextActions.push({
          label: zh ? `前往「${id}」继续` : `Continue in ${id}`,
          moduleId: id
        })
      }
      if (nextActions.length >= 4) break
    }
  }

  return {
    version: 1,
    modules,
    passport,
    scores,
    gaps,
    readiness,
    nextActions,
    locale,
    notes: input.notes,
    updatedAt: new Date().toISOString()
  }
}

export function isOverviewState(value: unknown): value is OverviewState {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as OverviewState).version === 1 &&
      Array.isArray((value as OverviewState).passport)
  )
}

export function normalizeOverviewState(raw: unknown): OverviewState | null {
  if (!raw) return null
  if (isOverviewState(raw)) return raw
  return null
}

export function overviewToMarkdown(state: OverviewState): string {
  const lines = [
    `# Paper Overview · readiness ${state.readiness}`,
    "",
    `- Updated: ${state.updatedAt}`,
    `- Locale: ${state.locale}`,
    ""
  ]
  lines.push("## Pipeline", "")
  for (const id of OVERVIEW_PIPELINE) {
    const st = state.modules[id as keyof typeof state.modules]?.status || "empty"
    lines.push(`- ${id}: **${st}**`)
  }
  lines.push("", "## Passport", "")
  for (const p of state.passport) {
    lines.push(
      `- \`${p.kind}\` ${p.title} · ${p.gateSummary} · ${p.createdAt}`
    )
  }
  if (state.scores.length) {
    lines.push("", "## Scores", "")
    for (const s of state.scores) {
      lines.push(`- ${s.label}: ${s.value}`)
    }
  }
  if (state.gaps.length) {
    lines.push("", "## Gaps", "")
    for (const g of state.gaps) {
      lines.push(`- **${g.severity}** [${g.moduleId}] ${g.message}`)
    }
  }
  if (state.nextActions.length) {
    lines.push("", "## Next", "")
    for (const a of state.nextActions) {
      lines.push(`- → ${a.moduleId}: ${a.label}`)
    }
  }
  if (state.notes?.trim()) {
    lines.push("", "## Notes", "", state.notes.trim())
  }
  return lines.join("\n")
}
