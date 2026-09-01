/**
 * Silent research-workflow router.
 * Maps user intent / canvas mode → Supervisor-Skills + scientific-feedback
 * procedures without exposing skill names in the UI.
 */

export type ResearchStage =
  | "ideate"
  | "evaluate"
  | "survey"
  | "structure"
  | "draft"
  | "polish"
  | "review"
  | "figures"
  | "brainstorm"

/** Canvas mode or free-form intent → primary skill directory id */
export const STAGE_TO_SKILL: Record<string, string> = {
  idle: "",
  evaluator: "idea-evaluator",
  evaluate: "idea-evaluator",
  ideate: "idea-evaluator",
  drafting: "intro-drafter",
  draft: "intro-drafter",
  structure: "tech-paper-template",
  "tech-paper": "tech-paper-template",
  benchmark: "benchmark-paper-template",
  "literature-review": "literature-review",
  survey: "deep-research",
  "deep-research": "deep-research",
  brainstorm: "brainstorm",
  polish: "paper-polish",
  revise_feedback: "paper-polish",
  revise_scoped: "paper-polish",
  write: "paper-writer",
  "paper-writer": "paper-writer",
  outline: "tech-paper-template",
  draft_section: "paper-writer",
  intro: "intro-drafter",
  nature_style: "paper-writer",
  review: "scientific-feedback",
  "scientific-feedback": "scientific-feedback",
  "pre-submission": "pre-submission-reviewer",
  figures: "figure-designer",
  "knowledge-graph": "",
  vibe: "vibe-research-workflow"
}

/** Secondary skills to soft-compose for richer module behavior */
export const STAGE_SUPPORT_SKILLS: Record<string, string[]> = {
  evaluator: ["idea-evaluator"],
  drafting: ["intro-drafter", "scientific-feedback"],
  "literature-review": ["literature-review", "deep-research"],
  brainstorm: ["brainstorm"],
  review: ["scientific-feedback", "pre-submission-reviewer"],
  polish: ["paper-polish", "scientific-feedback"],
  revise_feedback: ["paper-polish", "scientific-feedback"],
  revise_scoped: ["paper-polish"],
  write: ["paper-writer", "intro-drafter"],
  outline: ["tech-paper-template", "paper-writer"],
  draft_section: ["paper-writer", "scientific-feedback"],
  intro: ["intro-drafter", "scientific-feedback"],
  nature_style: ["paper-writer"]
}

/**
 * Infer a silent workflow stage from free text (chat / selection actions).
 * Returns a skill id, never a user-facing label.
 */
export function inferSkillIdFromText(text: string): string {
  const t = (text || "").toLowerCase()

  const rules: [RegExp, string][] = [
    [/scientific feedback|peer review|review outline|manuscript feedback|paper feedback/, "scientific-feedback"],
    [/pre[- ]?submission|proofread|audit before submission|camera[- ]?ready/, "pre-submission-reviewer"],
    [/paper polish|improve (the )?tone|polish (this|the) (prose|writing|section)|润色|去AI腔|改稿|审稿意见/, "paper-polish"],
    [/revise from feedback|scoped revise|局部改|按意见改/, "paper-polish"],
    [/write (a |the )?(section|paper|abstract|methods|discussion)|paper writer|turn .* into paper|撰写|分节起草/, "paper-writer"],
    [/deep research|survey (this|the)|research landscape|state of the art survey/, "deep-research"],
    [/literature review|related work|文献综述|综述/, "literature-review"],
    [/brainstorm|brain storm/, "brainstorm"],
    [/evaluate (this |the )?idea|novelty check|is this a good research|score this idea/, "idea-evaluator"],
    [/draft (an? )?intro|introduction outline|intro[- ]?drafter/, "intro-drafter"],
    [/tech paper|paper skeleton|logical structure|thinking template/, "tech-paper-template"],
    [/benchmark paper|evaluation suite|leaderboard paper/, "benchmark-paper-template"],
    [/figure design|design (a )?figure|draw\.io|diagram reconstruction/, "figure-designer"],
    [/vibe (research|coding|writing)|ai[- ]assisted research workflow/, "vibe-research-workflow"],
    [/find (relevant )?citations|cite this|citation for/, "literature-review"]
  ]

  for (const [re, skillId] of rules) {
    if (re.test(t)) return skillId
  }
  return ""
}

export function skillIdForCanvasMode(mode: string): string {
  return STAGE_TO_SKILL[mode] || ""
}
