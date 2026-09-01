/**
 * MentorOS · cross-module handoff contracts
 * Source of truth for module I/O. Keep UI/API/skills aligned with these shapes.
 */

export type Locale = "en" | "zh"

export type EvidenceLevel = "L0" | "L1" | "L2" | "L3"

export type GateSeverity = "BLOCK" | "WARN" | "INFO" | "CLEAR"

export type GateResult = {
  id: string
  severity: GateSeverity
  message: string
  fixHint?: string
}

export type ResearchQuestion = {
  id: string
  text: string
  locked?: boolean
}

export type EvidencePaper = {
  id: string // P1, P2, ...
  title: string
  authors: string[]
  year: number
  url: string
  summary: string
  venue?: string
  citationCount?: number
  sources?: string[]
  evidenceLevel?: EvidenceLevel
}

export type LiteraturePacket = {
  version: 1
  topic: string
  locale: Locale
  researchQuestions: ResearchQuestion[]
  domains: { id: string; labelZh: string; labelEn: string }[]
  queryPlan?: {
    primaryEn: string
    phrases: string[]
    backgroundZh?: string
    backgroundEn?: string
  }
  papers: EvidencePaper[]
  lineage?: {
    narrative: string
    threads: { name: string; description: string; paperIds: string[] }[]
  }
  review?: {
    abstract: string
    sections: { heading: string; content: string }[]
    gaps: string[]
    futureDirections: string[]
    answersToRQs?: { questionId: string; answer: string }[]
  }
  timeline?: {
    year: number
    method: string
    paperId: string
    contribution: string
  }[]
  references: string[]
  gates: GateResult[]
  createdAt: string
}

export type IdeaVerdict =
  | "strong_accept"
  | "accept_with_revisions"
  | "reject_and_pivot"

export type IdeaCard = {
  version: 1
  title: string
  oneLiner: string
  paperType: "novel_problem" | "novel_method" | "new_setting" | "other"
  researchQuestions: ResearchQuestion[]
  hypotheses: string[]
  scores: {
    higher: { score: number; rationale: string }
    faster: { score: number; rationale: string }
    stronger: { score: number; rationale: string }
    cheaper: { score: number; rationale: string }
    broader: { score: number; rationale: string }
  }
  fatalFlaws: {
    id: string
    severity: "FATAL" | "MAJOR"
    detail: string
    mitigation?: string
  }[]
  capabilityFit?: string
  venueSuggestion?: string
  verdict: IdeaVerdict
  sourceLiteratureId?: string
  locale: Locale
  gates: GateResult[]
  createdAt: string
}

export type ExperimentRecord = {
  version: 1
  ideaId?: string
  status: "draft" | "recipe_locked" | "results_attached" | "interpreted"
  hypotheses: string[]
  baselines: { name: string; why: string; evidenceLevel?: EvidenceLevel }[]
  datasets: string[]
  metrics: string[]
  ablations: string[]
  robustnessChecks: string[]
  failureCriteria: string
  expectedArtifacts: string[]
  computePlan?: string
  runLogs?: string[]
  resultTables?: string[]
  interpretation?: {
    hypothesisOutcomes: {
      hypothesis: string
      outcome: "support" | "reject" | "inconclusive"
      note: string
    }[]
    claimChecks: {
      claim: string
      verdict:
        | "ALIGNED"
        | "OVERSTATED"
        | "NOT_SUPPORTED"
        | "PROVENANCE_INSUFFICIENT"
    }[]
  }
  locale: Locale
  gates: GateResult[]
  createdAt: string
}

export type WritingBundle = {
  version: 1
  mode:
    | "outline"
    | "draft_section"
    | "intro"
    | "nature_style"
    | "polish"
    | "revise_feedback"
    | "revise_scoped"
  section?: string
  content: string
  evidenceMap?: {
    id: string
    source: string
    level: EvidenceLevel
    supports: string
    cannotSupport: string
  }[]
  pendingSemanticDiffs?: {
    before: string
    after: string
    reason: string
    commentId?: string
    accepted?: boolean
  }[]
  reviewResponses?: {
    id: string
    text: string
    stance?: "agree" | "partial" | "disagree"
    action?: string
    status?: "pending" | "applied" | "skipped"
  }[]
  publicationMode?: "draft" | "final"
  styleTier?: "academic" | "ml_conference" | "nature_like"
  /** Max length in words (EN) or non-whitespace chars (ZH); omit = unlimited */
  wordLimit?: number | null
  locale: Locale
  gates: GateResult[]
  createdAt: string
}

/** Shared draft + history used by Writing (draft) and Polish (revise) modules */
export type WritingSession = {
  version: 1
  current: WritingBundle | null
  history: {
    id: string
    label: string
    createdAt: string
    bundle: WritingBundle
  }[]
  comments: {
    id: string
    text: string
    stance?: "agree" | "partial" | "disagree"
    action?: string
    status?: "pending" | "applied" | "skipped"
  }[]
}

export type FigureSpec = {
  version: 1
  /** Runtime session id (optional in archives) */
  id?: string
  type: "motivated_example" | "solution_overview" | "experimental_results"
  claim: string
  layoutNotes: string
  paradigm?: string
  tool?: string
  captionDraft?: string
  panelPlan?: string
  paletteNotes?: string
  deliverable?: "design" | "render" | "code" | "prompt" | "ai_image"
  dataPayload?: string
  chartSpec?: {
    chartType: "bar" | "line" | "area" | "scatter"
    title?: string
    xKey: string
    xLabel?: string
    yLabel?: string
    series: { key: string; label?: string; color?: string }[]
    rows: Record<string, string | number>[]
  } | null
  codeArtifact?: string
  codeLanguage?: string
  promptArtifact?: string
  /** From dedicated image API only (not chat) */
  imageUrl?: string
  imageMime?: string
  qc: Record<string, boolean>
  locale: Locale
  gates: GateResult[]
  createdAt: string
}

export type ReviewReport = {
  version: 1
  overall?: number
  decisionTendency?: "accept" | "reject" | "borderline"
  perspectives: {
    name: string
    strengths: string[]
    weaknesses: string[]
    questions: string[]
  }[]
  checklist: {
    id: string
    severity: GateSeverity | "CRITICAL" | "MAJOR" | "MINOR" | "INFO"
    detail: string
    dimension?: string
    suggestion?: string
  }[]
  responseOutline?: {
    reviewPointId: string
    stance: "agree" | "partial" | "disagree"
    action: string
    confirmed?: boolean
  }[]
  rankedWeaknesses?: string[]
  readiness?: "red" | "yellow" | "green"
  locale: Locale
  gates: GateResult[]
  createdAt: string
}

export type OverviewState = {
  version: 1
  modules: {
    literature?: { status: string; packetId?: string }
    idea?: { status: string; cardId?: string }
    experiment?: { status: string; recordId?: string }
    writing?: { status: string }
    polish?: { status: string }
    figures?: { status: string }
    review?: { status: string }
  }
  passport: {
    id: string
    kind: string
    title: string
    createdAt: string
    gateSummary: GateSeverity
  }[]
  readiness: "red" | "yellow" | "green"
  nextActions: string[]
  locale: Locale
}
