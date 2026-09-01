import { ChatSettings } from "@/types"
import type { ExperimentRecord } from "@/lib/experiment-types"
import type { FigureSession } from "@/lib/figure-types"
import type { IdeaCard } from "@/lib/idea-types"
import {
  buildReviewGates,
  computeReadiness,
  deriveDimensionScores,
  REVIEW_DIMENSIONS,
  type ChecklistSeverity,
  type DecisionTendency,
  type ResponseOutlineItem,
  type ReviewChecklistItem,
  type ReviewDimension,
  type ReviewDimensionScores,
  type ReviewLocale,
  type ReviewPerspective,
  type ReviewReport,
  type ScientificFeedbackOutline
} from "@/lib/review-types"
import { buildScientificFeedbackUserPrompt } from "@/lib/scientific-feedback"
import type { WritingSession } from "@/lib/writing-types"
import { loadInjectableFragment } from "@/lib/server/load-injectable"
import { loadComposedSkillPrompt } from "@/lib/server/load-skill"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type ReviewMode = "full" | "checklist" | "perspectives" | "response"

interface ReviewRequest {
  mode?: ReviewMode
  manuscript: string
  userNotes?: string
  ideaCard?: IdeaCard | null
  experimentRecord?: ExperimentRecord | null
  writingSession?: WritingSession | null
  figureSession?: FigureSession | null
  chatSettings: ChatSettings
  provider: string
  customModelId?: string
  locale?: string
}

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function extractJson(text: string): string {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim()
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")
  if (start >= 0 && end > start) return cleaned.slice(start, end + 1)
  return cleaned
}

function resolveLocale(raw?: string): ReviewLocale {
  return String(raw || "").toLowerCase().startsWith("zh") ? "zh" : "en"
}

function normalizeSeverity(raw: unknown): ChecklistSeverity {
  const v = String(raw || "MINOR").toUpperCase()
  if (v === "CRITICAL" || v === "MAJOR" || v === "MINOR" || v === "INFO")
    return v
  if (v === "BLOCK") return "CRITICAL"
  if (v === "WARN") return "MAJOR"
  return "MINOR"
}

function languageInstruction(locale: ReviewLocale): string {
  if (locale === "zh") {
    return "Write all human-readable review text (details, strengths, weaknesses, questions, actions, rankedWeaknesses) in Simplified Chinese. Keep severity enums and ids in English."
  }
  return "Write the review in clear academic English."
}

function buildPrompt(req: ReviewRequest, locale: ReviewLocale): string {
  const injectable = loadInjectableFragment("review")
  const skill = loadComposedSkillPrompt("pre-submission-reviewer", [
    "scientific-feedback"
  ])
  const mode = req.mode || "full"
  const idea = req.ideaCard
  const exp = req.experimentRecord
  const writing = req.writingSession?.current

  const ideaBlock = idea
    ? JSON.stringify(
        { title: idea.title, oneLiner: idea.oneLiner, verdict: idea.verdict },
        null,
        2
      )
    : "(none)"

  const expBlock = exp
    ? JSON.stringify(
        {
          status: exp.status,
          hasLogs: asArray(exp.runLogs).some(x => String(x || "").trim()),
          hasTables: asArray(exp.resultTables).some(x =>
            String(x || "").trim()
          )
        },
        null,
        2
      )
    : "(none)"

  // Liang et al. outline methodology (arXiv:2310.01783) — already in skill;
  // also inject the concrete user-prompt template for structure fidelity.
  const liangOutlineGuide = buildScientificFeedbackUserPrompt({
    title: idea?.title || writing?.section || "Manuscript under review",
    abstract: "",
    figureAndTableCaptions: "",
    mainContent: (req.manuscript || "").slice(0, 12000)
  })

  return `${injectable}

${skill ? `--- SKILL ---\n${skill.slice(0, 30000)}\n--- END SKILL ---\n` : ""}

MODE: ${mode}
Run a pre-submission + multi-perspective peer review. Do NOT rewrite the manuscript — only findings and a response outline.

Also follow the scientific-feedback / Liang et al. review-outline methodology (significance & novelty; accept reasons; 4 reject reasons each with ≥2 sub-points; 4 improvement suggestions). Prefer method-design and claim–evidence critique over generic “add more datasets”.

Five-dimension checklist tags (use in checklist.dimension):
macro_logic | writing_detail | grammar | latex_format | figure_quality

Also score each dimension 1–10 in dimensionScores (higher = stronger / fewer issues).

Require ≥2 perspectives PLUS one named "Devil's Advocate".
Ensemble: overall 1–10, decisionTendency accept|reject|borderline, rankedWeaknesses.
Integrity: fabricated refs, overstated claims, numeric inconsistencies → CRITICAL checklist items.
Response outline: one row per major checklist id (or perspective weakness id) with stance agree|partial|disagree and a concrete action. Do not silently rewrite the paper.

--- LIANG OUTLINE REFERENCE (structure to encode as feedbackOutline JSON) ---
${liangOutlineGuide.slice(0, 8000)}
--- END LIANG OUTLINE REFERENCE ---

MANUSCRIPT:
${(req.manuscript || "").slice(0, 28000) || "(empty)"}

USER NOTES:
${(req.userNotes || "").slice(0, 4000) || "(none)"}

IDEA:
${ideaBlock}

EXPERIMENT SUMMARY:
${expBlock}

WRITING BUNDLE META:
${
  writing
    ? `mode=${writing.mode}; section=${writing.section || ""}; publication=${writing.publicationMode}`
    : "(none)"
}

FIGURE COUNT: ${req.figureSession?.figures?.length ?? 0}

${languageInstruction(locale)}
UI locale: ${locale}

Return ONLY valid JSON:
{
  "overall": 7,
  "decisionTendency": "accept|reject|borderline",
  "dimensionScores": {
    "macro_logic": 7,
    "writing_detail": 7,
    "grammar": 8,
    "latex_format": 8,
    "figure_quality": 6
  },
  "feedbackOutline": {
    "significanceNovelty": ["...", "..."],
    "acceptReasons": ["...", "..."],
    "rejectReasons": [
      { "title": "key reason", "details": ["sub-point 1", "sub-point 2"] }
    ],
    "suggestions": ["...", "...", "...", "..."]
  },
  "rankedWeaknesses": ["...", "..."],
  "checklist": [
    {
      "id": "C1",
      "severity": "CRITICAL|MAJOR|MINOR|INFO",
      "dimension": "macro_logic",
      "detail": "finding",
      "suggestion": "concrete fix hint"
    }
  ],
  "perspectives": [
    {
      "name": "Methods skeptic",
      "strengths": ["..."],
      "weaknesses": ["..."],
      "questions": ["..."]
    },
    {
      "name": "Devil's Advocate",
      "strengths": [],
      "weaknesses": ["..."],
      "questions": ["..."]
    }
  ],
  "responseOutline": [
    {
      "reviewPointId": "C1",
      "stance": "agree|partial|disagree",
      "action": "what the author should change"
    }
  ]
}`
}

async function generateJsonContent(
  request: NextRequest,
  json: ReviewRequest,
  prompt: string,
  locale: ReviewLocale
): Promise<string> {
  const temperature = Math.min(
    Math.max(json.chatSettings.temperature ?? 0.35, 0.15),
    0.65
  )

  if (json.provider === "ollama") {
    const ollamaUrl =
      process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434"
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: json.chatSettings.model,
        stream: false,
        format: "json",
        options: { temperature },
        messages: [
          {
            role: "system",
            content:
              "You are a strict JSON generator for MentorOS peer review. Output one valid JSON object only. Never rewrite the paper body."
          },
          { role: "user", content: prompt }
        ]
      }),
      signal: AbortSignal.timeout(180000)
    })
    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`)
    const data = await response.json()
    return data.message?.content || ""
  }

  const generateResponse = await fetch(
    new URL("/api/copilot/generate", request.url),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || ""
      },
      body: JSON.stringify({
        chatSettings: { ...json.chatSettings, temperature },
        provider: json.provider,
        customModelId: json.customModelId,
        messages: [
          {
            role: "system",
            content:
              "You generate strictly valid JSON for MentorOS review. Findings only — do not rewrite the manuscript. Flag fabricated refs and overstated claims as CRITICAL."
          },
          { role: "user", content: prompt }
        ]
      }),
      signal: AbortSignal.timeout(180000)
    }
  )

  if (!generateResponse.ok) {
    const msg =
      locale === "zh"
        ? `模型请求失败（HTTP ${generateResponse.status}）`
        : `Model request failed (HTTP ${generateResponse.status})`
    throw new Error(msg)
  }

  const { content } = (await generateResponse.json()) as { content: string }
  return content
}

function parseReport(
  raw: string,
  req: ReviewRequest,
  locale: ReviewLocale
): ReviewReport {
  let parsed: Record<string, unknown> = {}
  let parseFailed = false
  try {
    parsed = JSON.parse(extractJson(raw)) as Record<string, unknown>
  } catch {
    parseFailed = true
    parsed = {}
  }

  const checklist: ReviewChecklistItem[] = asArray(
    parsed.checklist as unknown[]
  )
    .map((raw, i) => {
      const c = (raw || {}) as Record<string, unknown>
      return {
        id: String(c.id || `C${i + 1}`).slice(0, 24),
        severity: normalizeSeverity(c.severity),
        detail: String(c.detail || c.message || "").trim(),
        dimension: c.dimension ? String(c.dimension).slice(0, 48) : undefined,
        suggestion: c.suggestion ? String(c.suggestion).trim() : undefined
      }
    })
    .filter(c => c.detail)

  const perspectives: ReviewPerspective[] = asArray(
    parsed.perspectives as ReviewPerspective[]
  )
    .map(p => ({
      name: String(p?.name || "Reviewer").slice(0, 80),
      strengths: asArray(p?.strengths).map(s => String(s)).filter(Boolean),
      weaknesses: asArray(p?.weaknesses).map(s => String(s)).filter(Boolean),
      questions: asArray(p?.questions).map(s => String(s)).filter(Boolean)
    }))
    .filter(p => p.name)

  const responseOutline: ResponseOutlineItem[] = asArray(
    parsed.responseOutline as unknown[]
  )
    .map(raw => {
      const r = (raw || {}) as Record<string, unknown>
      const stanceRaw = String(r.stance || "")
      return {
        reviewPointId: String(r.reviewPointId || r.id || "").slice(0, 24),
        stance:
          stanceRaw === "agree" ||
          stanceRaw === "disagree" ||
          stanceRaw === "partial"
            ? (stanceRaw as ResponseOutlineItem["stance"])
            : ("partial" as const),
        action: String(r.action || "").trim(),
        confirmed: false
      }
    })
    .filter(r => r.reviewPointId && r.action)

  let overall: number | undefined
  if (typeof parsed.overall === "number" && Number.isFinite(parsed.overall)) {
    overall = Math.min(10, Math.max(1, Math.round(parsed.overall)))
  } else if (
    typeof parsed.overall === "string" &&
    parsed.overall.trim() !== ""
  ) {
    const n = Number(parsed.overall)
    if (Number.isFinite(n)) overall = Math.min(10, Math.max(1, Math.round(n)))
  }

  const tendencyRaw = String(parsed.decisionTendency || "").toLowerCase()
  const decisionTendency: DecisionTendency | undefined =
    tendencyRaw === "accept" ||
    tendencyRaw === "reject" ||
    tendencyRaw === "borderline"
      ? tendencyRaw
      : undefined

  const rankedWeaknesses = asArray(
    parsed.rankedWeaknesses as string[]
  )
    .map(s => String(s).trim())
    .filter(Boolean)
    .slice(0, 12)

  const rawScores = (parsed.dimensionScores || {}) as Record<string, unknown>
  const dimensionScores: ReviewDimensionScores = {}
  for (const dim of REVIEW_DIMENSIONS) {
    const n = Number(rawScores[dim])
    if (Number.isFinite(n) && String(rawScores[dim]).trim() !== "") {
      dimensionScores[dim as ReviewDimension] = Math.min(
        10,
        Math.max(1, Math.round(n))
      )
    }
  }
  const hasDimScores = REVIEW_DIMENSIONS.some(
    d => dimensionScores[d] != null
  )
  const finalDimScores = hasDimScores
    ? { ...deriveDimensionScores(checklist), ...dimensionScores }
    : deriveDimensionScores(checklist)

  const foRaw = (parsed.feedbackOutline || {}) as Record<string, unknown>
  const rejectRaw = asArray(foRaw.rejectReasons as unknown[])
  const feedbackOutline: ScientificFeedbackOutline | undefined = (() => {
    const significanceNovelty = asArray(foRaw.significanceNovelty as string[])
      .map(s => String(s).trim())
      .filter(Boolean)
    const acceptReasons = asArray(foRaw.acceptReasons as string[])
      .map(s => String(s).trim())
      .filter(Boolean)
    const rejectReasons = rejectRaw
      .map(raw => {
        if (typeof raw === "string") {
          return { title: raw.trim(), details: [] as string[] }
        }
        const r = (raw || {}) as Record<string, unknown>
        return {
          title: String(r.title || r.reason || "").trim(),
          details: asArray(r.details as string[])
            .map(d => String(d).trim())
            .filter(Boolean)
        }
      })
      .filter(r => r.title)
    const suggestions = asArray(foRaw.suggestions as string[])
      .map(s => String(s).trim())
      .filter(Boolean)
    if (
      !significanceNovelty.length &&
      !acceptReasons.length &&
      !rejectReasons.length &&
      !suggestions.length
    ) {
      return undefined
    }
    return {
      significanceNovelty,
      acceptReasons,
      rejectReasons,
      suggestions
    }
  })()

  if (!checklist.length && !perspectives.length) {
    checklist.push({
      id: "C0",
      severity: parseFailed ? "MAJOR" : "INFO",
      detail: parseFailed
        ? locale === "zh"
          ? "模型返回无法解析为有效审稿 JSON，请重试。"
          : "Model response could not be parsed as review JSON — please retry."
        : locale === "zh"
          ? "模型未返回可用审稿条目，请重试或加长稿件。"
          : "Model returned no usable review items — retry or provide more manuscript text.",
      dimension: "macro_logic"
    })
  }

  const base = {
    version: 1 as const,
    overall,
    decisionTendency,
    dimensionScores: finalDimScores,
    feedbackOutline,
    perspectives,
    checklist,
    responseOutline,
    rankedWeaknesses,
    readiness: computeReadiness(checklist),
    manuscriptExcerpt: (req.manuscript || "").slice(0, 500),
    locale,
    createdAt: new Date().toISOString()
  }

  return {
    ...base,
    gates: buildReviewGates(base)
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = (await request.json()) as ReviewRequest
    const locale = resolveLocale(json.locale)

    if (!json.chatSettings || !json.provider) {
      return NextResponse.json(
        { message: "chatSettings and provider are required" },
        { status: 400 }
      )
    }

    const manuscript = String(json.manuscript || "").trim()
    if (manuscript.length < 80) {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? "请提供足够长的文稿（可从撰写模块导入或粘贴）"
              : "Provide a substantial manuscript (import from Writing or paste)"
        },
        { status: 400 }
      )
    }

    const prompt = buildPrompt(json, locale)
    const raw = await generateJsonContent(request, json, prompt, locale)
    const report = parseReport(raw, json, locale)

    return NextResponse.json({ report })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Review request failed"
    return NextResponse.json({ message }, { status: 500 })
  }
}
