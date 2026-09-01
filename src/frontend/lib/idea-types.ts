/** Runtime Idea module types — aligned with docs/distill/schemas/handoff.ts */

export type IdeaLocale = "en" | "zh"

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

export type IdeaPaperType =
  | "novel_problem"
  | "novel_method"
  | "new_setting"
  | "other"

export type IdeaVerdict =
  | "strong_accept"
  | "accept_with_revisions"
  | "reject_and_pivot"

export type DimensionScore = {
  score: number
  rationale: string
}

export type IdeaScores = {
  higher: DimensionScore
  faster: DimensionScore
  stronger: DimensionScore
  cheaper: DimensionScore
  broader: DimensionScore
}

export type FatalFlaw = {
  id: string
  severity: "FATAL" | "MAJOR"
  detail: string
  mitigation?: string
}

/** Phase A candidate — no final verdict */
export type IdeaCandidate = {
  id: string
  title: string
  oneLiner: string
  paperType: IdeaPaperType
  inspiration?: string
  /** Full proposal / imported document body for evaluation */
  notes?: string
  source?: "brainstorm" | "text" | "document" | "literature"
}

/** Build a candidate from pasted text or extracted document. */
export function buildCandidateFromText(
  text: string,
  opts?: {
    sourceName?: string
    source?: IdeaCandidate["source"]
    paperType?: IdeaPaperType
    id?: string
  }
): IdeaCandidate | null {
  const body = String(text || "").trim()
  if (!body) return null

  const lines = body
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  // Prefer a Markdown/heading-like first line as title
  let title = lines[0] || body.slice(0, 72)
  title = title
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/^["「『]|["」』]$/g, "")
    .trim()
  if (title.length > 96) title = `${title.slice(0, 93)}…`

  const oneLiner =
    lines.length > 1
      ? lines.slice(1, 4).join(" ").slice(0, 320)
      : body.slice(0, 320)

  return {
    id: opts?.id || `I${Date.now().toString(36)}`,
    title: title || "Imported idea",
    oneLiner: oneLiner || title,
    paperType: opts?.paperType || "other",
    inspiration: opts?.sourceName || opts?.source || "user import",
    notes: body.slice(0, 24000),
    source: opts?.source || "text"
  }
}

export type IdeaCard = {
  version: 1
  id?: string
  candidateId?: string
  title: string
  oneLiner: string
  paperType: IdeaPaperType
  researchQuestions: ResearchQuestion[]
  hypotheses: string[]
  scores: IdeaScores
  fatalFlaws: FatalFlaw[]
  capabilityFit?: string
  venueSuggestion?: string
  revisionAdvice?: string[]
  verdict: IdeaVerdict
  sourceLiteratureId?: string
  locale: IdeaLocale
  gates: GateResult[]
  createdAt: string
}

export type IdeaCapability = {
  hoursPerWeek?: number
  compute?: string
  deadlineWeeks?: number
  notes?: string
}

export const PAPER_TYPES: IdeaPaperType[] = [
  "novel_problem",
  "novel_method",
  "new_setting",
  "other"
]

export const SCORE_KEYS: (keyof IdeaScores)[] = [
  "higher",
  "faster",
  "stronger",
  "cheaper",
  "broader"
]

export function emptyScores(rationale = ""): IdeaScores {
  return {
    higher: { score: 3, rationale },
    faster: { score: 3, rationale },
    stronger: { score: 3, rationale },
    cheaper: { score: 3, rationale },
    broader: { score: 3, rationale }
  }
}

export function canAdvanceToExperiment(
  card: IdeaCard | null,
  force = false
): boolean {
  if (!card) return false
  if (force) return true
  const unmitigatedFatal = card.fatalFlaws.some(
    f => f.severity === "FATAL" && !String(f.mitigation || "").trim()
  )
  if (unmitigatedFatal) return false
  if (card.verdict === "reject_and_pivot") return false
  const blocked = card.gates.some(g => g.severity === "BLOCK")
  if (blocked) return false
  return (
    card.verdict === "strong_accept" ||
    card.verdict === "accept_with_revisions"
  )
}

export function ideaCardToMarkdown(card: IdeaCard): string {
  const lines = [
    `# IdeaCard · ${card.title || "Untitled"}`,
    "",
    `- One-liner: ${card.oneLiner || ""}`,
    `- Paper type: ${card.paperType}`,
    `- Verdict: ${card.verdict}`,
    `- Locale: ${card.locale}`,
    `- Created: ${card.createdAt}`,
    ""
  ]
  if (card.researchQuestions?.length) {
    lines.push("## Research questions", "")
    for (const rq of card.researchQuestions) {
      lines.push(`- [${rq.id}] ${rq.text}${rq.locked ? " _(locked)_" : ""}`)
    }
    lines.push("")
  }
  if (card.hypotheses?.length) {
    lines.push("## Hypotheses", "")
    for (const h of card.hypotheses) lines.push(`- ${h}`)
    lines.push("")
  }
  if (card.scores) {
    lines.push("## Scores (5D)", "")
    for (const [k, v] of Object.entries(card.scores)) {
      lines.push(`- **${k}**: ${v.score}/5 — ${v.rationale || ""}`)
    }
    lines.push("")
  }
  if (card.fatalFlaws?.length) {
    lines.push("## Fatal flaws", "")
    for (const f of card.fatalFlaws) {
      lines.push(
        `- **${f.severity}** ${f.detail}${f.mitigation ? ` → mitigation: ${f.mitigation}` : ""}`
      )
    }
    lines.push("")
  }
  if (card.capabilityFit) {
    lines.push("## Capability fit", "", card.capabilityFit, "")
  }
  if (card.venueSuggestion) {
    lines.push(`## Venue`, "", card.venueSuggestion, "")
  }
  if (card.revisionAdvice?.length) {
    lines.push("## Revision advice", "")
    for (const a of card.revisionAdvice) lines.push(`- ${a}`)
    lines.push("")
  }
  if (card.gates?.length) {
    lines.push("## Gates", "")
    for (const g of card.gates) {
      lines.push(`- **${g.severity}** [${g.id}] ${g.message}`)
    }
    lines.push("")
  }
  return lines.join("\n")
}

export function ideaWorkspaceToMarkdown(opts: {
  ideaCard: IdeaCard | null
  ideaCandidates: IdeaCandidate[]
}): string {
  const parts: string[] = ["# Idea workspace", ""]
  if (opts.ideaCard) {
    parts.push(ideaCardToMarkdown(opts.ideaCard), "")
  } else {
    parts.push("_No confirmed IdeaCard yet._", "")
  }
  if (opts.ideaCandidates.length) {
    parts.push("## Candidates", "")
    for (const c of opts.ideaCandidates) {
      parts.push(
        `### ${c.title || c.id}`,
        "",
        `- One-liner: ${c.oneLiner || ""}`,
        `- Type: ${c.paperType}`,
        `- Source: ${c.source || "n/a"}`,
        ""
      )
      if (c.inspiration) parts.push(`- Inspiration: ${c.inspiration}`)
      if (c.notes?.trim()) {
        parts.push("", "```", c.notes.trim().slice(0, 8000), "```", "")
      }
    }
  }
  return parts.join("\n")
}
