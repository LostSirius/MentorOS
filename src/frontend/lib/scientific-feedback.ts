/**
 * Scientific feedback prompt builder adapted from
 * Weixin-Liang/LLM-scientific-feedback (Liang et al., arXiv:2310.01783).
 * Used silently by drafting critiques + /api/scientific-feedback.
 */

export type ScientificPaperInput = {
  title?: string
  abstract?: string
  figureAndTableCaptions?: string
  mainContent?: string
}

const MAX_MAIN_CHARS = 24000

function truncate(text: string, maxChars: number): string {
  if (!text) return ""
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + "\n…[truncated]"
}

export function buildScientificFeedbackUserPrompt(
  paper: ScientificPaperInput
): string {
  const title = (paper.title || "Untitled submission").trim()
  const abstract = (paper.abstract || "").trim()
  const captions = (paper.figureAndTableCaptions || "").trim()
  const main = truncate((paper.mainContent || "").trim(), MAX_MAIN_CHARS)

  const body = [
    abstract && `Abstract:\n\`\`\`\n${abstract}\n\`\`\``,
    captions && `Figures/Tables Captions:\n\`\`\`\n${captions}\n\`\`\``,
    main && `Main Content:\n\`\`\`\n${main}\n\`\`\``
  ]
    .filter(Boolean)
    .join("\n\n")

  return `Your task now is to draft a high-quality review outline for a top-tier research venue for a submission titled "${title}":

${body || "(User provided limited manuscript text — review what is available and note gaps.)"}

======
Your task:
Compose a high-quality peer review outline of a research paper submitted to a top-tier venue.

Start by "Review outline:".
And then:
"1. Significance and novelty"
"2. Potential reasons for acceptance"
"3. Potential reasons for rejection", List 4 key reasons. For each of 4 key reasons, use **>=2 sub bullet points** to further clarify and support your arguments in painstaking details.
"4. Suggestions for improvement", List 4 key suggestions.

Be thoughtful and constructive. Prefer method-design and claim-evidence critique over generic requests for more datasets when the text supports it. Write Outlines only.
`
}

export const SCIENTIFIC_FEEDBACK_SYSTEM = `You are an experienced program-committee member for top-tier ML/AI and STEM venues. You provide structured scientific feedback that complements human peer review. Follow the review-outline format exactly. Do not rewrite the paper.`
