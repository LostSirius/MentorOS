import { ChatSettings } from "@/types"
import type { ExperimentRecord } from "@/lib/experiment-types"
import type { IdeaCard } from "@/lib/idea-types"
import {
  FIGURE_DELIVERABLES,
  FIGURE_TYPES,
  buildFigureGates,
  emptyQc,
  normalizeChartSpec,
  normalizeQc,
  newFigureId,
  type FigureDeliverable,
  type FigureLocale,
  type FigureSpec,
  type FigureType
} from "@/lib/figure-types"
import { loadInjectableFragment } from "@/lib/server/load-injectable"
import { loadComposedSkillPrompt } from "@/lib/server/load-skill"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type FiguresMode = "design" | "audit"

interface FiguresRequest {
  mode?: FiguresMode
  /** design = guidance; render = chart from data; code = plotting code; prompt = gen prompt */
  deliverable?: FigureDeliverable
  type: FigureType
  claim: string
  /** Optional user notes / existing layout to audit */
  userNotes?: string
  /** CSV / TSV / JSON table for render (or grounding for code) */
  dataPayload?: string
  /** Code language hint: python | plotly | drawio | tikz */
  codeLanguage?: string
  existing?: Partial<FigureSpec> | null
  ideaCard?: IdeaCard | null
  experimentRecord?: ExperimentRecord | null
  writingExcerpt?: string
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

function resolveLocale(raw?: string): FigureLocale {
  return String(raw || "").toLowerCase().startsWith("zh") ? "zh" : "en"
}

function normalizeType(raw: unknown): FigureType {
  const v = String(raw || "motivated_example")
  return (FIGURE_TYPES as string[]).includes(v)
    ? (v as FigureType)
    : "motivated_example"
}

function hasExperimentResults(record?: ExperimentRecord | null): boolean {
  if (!record) return false
  const logs = asArray(record.runLogs).some(x => String(x || "").trim())
  const tables = asArray(record.resultTables).some(x => String(x || "").trim())
  return logs || tables
}

function normalizeDeliverable(raw: unknown): FigureDeliverable {
  const v = String(raw || "design")
  return (FIGURE_DELIVERABLES as string[]).includes(v)
    ? (v as FigureDeliverable)
    : "design"
}

function languageInstruction(
  locale: FigureLocale,
  deliverable: FigureDeliverable
): string {
  if (locale === "zh") {
    if (deliverable === "code") {
      return "layoutNotes / captionDraft 用简体中文；codeArtifact 为可运行代码（注释可用中文）。QC keys 保持英文 camelCase。"
    }
    if (deliverable === "prompt" || deliverable === "ai_image") {
      return "layoutNotes 用简体中文说明；promptArtifact 建议英文（生图模型更稳）。QC keys 保持英文 camelCase。"
    }
    return "layoutNotes、captionDraft、panelPlan、paletteNotes、paradigm 用简体中文。QC keys 保持英文 camelCase。"
  }
  return "Write guidance fields in clear academic English."
}

function buildPrompt(req: FiguresRequest, locale: FigureLocale): string {
  const injectable = loadInjectableFragment("figures")
  const skill = loadComposedSkillPrompt("figure-designer", [
    "drawio-reconstruction"
  ])
  const mode: FiguresMode = req.mode === "audit" ? "audit" : "design"
  const type = normalizeType(req.type)
  const deliverable = normalizeDeliverable(req.deliverable)
  const hasResults = hasExperimentResults(req.experimentRecord)
  const idea = req.ideaCard
  const exp = req.experimentRecord
  const dataPayload = String(req.dataPayload || "").slice(0, 12000)
  const codeLang = String(req.codeLanguage || "python").slice(0, 24)

  const ideaBlock = idea
    ? JSON.stringify(
        {
          title: idea.title,
          oneLiner: idea.oneLiner,
          paperType: idea.paperType
        },
        null,
        2
      )
    : "(none)"

  const expBlock = exp
    ? JSON.stringify(
        {
          status: exp.status,
          metrics: exp.metrics,
          baselines: exp.baselines,
          resultTables: asArray(exp.resultTables).slice(0, 3),
          hasResults
        },
        null,
        2
      )
    : "(none)"

  const deliverableInstructions: Record<FigureDeliverable, string> = {
    design:
      "Primary output: layoutNotes, panelPlan, paletteNotes, captionDraft, paradigm, tool. Leave chartSpec/codeArtifact/promptArtifact empty unless helpful.",
    render: `Primary output: chartSpec for an interactive preview.
- Use ONLY numbers/categories present in USER DATA (or experiment result tables). Never invent values.
- chartSpec.rows must be an array of objects copied/derived from USER DATA columns.
- Prefer bar/line for comparisons; colour-blind-safe series colours (≤6).
- Also fill layoutNotes + captionDraft briefly.`,
    code: `Primary output: codeArtifact — runnable ${codeLang} plotting code (or draw.io XML if codeLanguage=drawio).
- Ground numbers in USER DATA when provided; otherwise use clearly marked placeholders like VALUE_FROM_USER.
- Include axis labels, legend, dual encoding comments.
- Also set codeLanguage and a short layoutNotes.`,
    prompt: `Primary output: promptArtifact — a detailed prompt to recreate the figure in an image tool or draw.io reconstruction.
- Describe layout, panels, labels, palette, and what claim the figure proves.
- Do not invent experimental numbers; refer to "user-provided results" if data missing.
- Also fill layoutNotes briefly.`,
    ai_image: `Primary output: promptArtifact only — a strong English image-generation prompt for a scientific paper figure.
- Do NOT claim to have rendered pixels; image pixels are produced by a SEPARATE dedicated image API.
- Describe composition, panels, labels, colour-blind-safe palette, and the claim.
- Never invent experimental numbers.
- Also fill a short layoutNotes in the UI locale.`
  }

  return `${injectable}

${skill ? `--- SKILL ---\n${skill.slice(0, 28000)}\n--- END SKILL ---\n` : ""}

MODE: ${mode}
DELIVERABLE: ${deliverable}
${deliverableInstructions[deliverable]}
FIGURE TYPE: ${type}
CLAIM (must prove): ${(req.claim || "").slice(0, 2000) || "(MISSING — refuse decorative figure)"}
USER NOTES / REQUIREMENTS:
${(req.userNotes || req.existing?.layoutNotes || "").slice(0, 8000) || "(none)"}
USER DATA (CSV / TSV / JSON — authoritative numbers):
${dataPayload || "(none)"}
PREFERRED CODE LANGUAGE: ${codeLang}
WRITING EXCERPT (optional context):
${(req.writingExcerpt || "").slice(0, 4000) || "(none)"}

IDEA CARD:
${ideaBlock}

EXPERIMENT:
${expBlock}
HAS EXPERIMENT RESULTS: ${hasResults ? "yes" : "no"}

${languageInstruction(locale, deliverable)}
UI locale: ${locale}

Rules:
1. Refuse if CLAIM is missing — return layoutNotes explaining refusal.
2. Never invent experimental numbers. If DELIVERABLE=render and USER DATA is empty, say so in layoutNotes and return chartSpec=null.
3. Caption first sentence states the finding when possible.
4. qcSuggestions: true only when the design already satisfies the item; leave export/font for the user.

Return ONLY valid JSON:
{
  "type": "${type}",
  "claim": "echo or tighten the claim",
  "deliverable": "${deliverable}",
  "paradigm": "recommended paradigm",
  "tool": "primary tool",
  "layoutNotes": "markdown guidance",
  "panelPlan": "panel plan or empty",
  "paletteNotes": "palette notes or empty",
  "captionDraft": "caption or empty",
  "codeLanguage": "${codeLang}",
  "codeArtifact": "full code or empty string",
  "promptArtifact": "full prompt or empty string",
  "chartSpec": {
    "chartType": "bar|line|area|scatter",
    "title": "...",
    "xKey": "column name",
    "xLabel": "...",
    "yLabel": "...",
    "series": [{ "key": "col", "label": "Ours", "color": "#4338ca" }],
    "rows": [{ "method": "A", "score": 0.81 }]
  },
  "qcSuggestions": {
    "vectorExport": false,
    "minFont8pt": false,
    "colorBlindSafe": true,
    "colorCountLe6": true,
    "captionFindingFirst": true,
    "axesNamed": true,
    "panelLetters": true,
    "statsAnnotated": false
  }
}`
}

async function generateJsonContent(
  request: NextRequest,
  json: FiguresRequest,
  prompt: string,
  locale: FigureLocale
): Promise<string> {
  const temperature = Math.min(
    Math.max(json.chatSettings.temperature ?? 0.4, 0.2),
    0.7
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
              "You are a strict JSON generator for MentorOS figure design. Output one valid JSON object only."
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
              "You generate strictly valid JSON for MentorOS figures. Never invent experimental numbers. Refuse decorative figures without a claim."
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

function parseBundle(
  raw: string,
  req: FiguresRequest,
  locale: FigureLocale
): FigureSpec {
  let parsed: Record<string, unknown> = {}
  try {
    parsed = JSON.parse(extractJson(raw)) as Record<string, unknown>
  } catch {
    parsed = {}
  }

  const claim = String(parsed.claim || req.claim || "").trim()
  const hasResults = hasExperimentResults(req.experimentRecord)
  const suggested = normalizeQc(parsed.qcSuggestions || parsed.qc)
  const existingQc = req.existing?.qc
    ? normalizeQc(req.existing.qc)
    : emptyQc()
  // Merge: keep user-checked true; adopt model suggestions for unchecked
  const qc = { ...existingQc }
  for (const key of Object.keys(suggested) as (keyof typeof suggested)[]) {
    if (suggested[key] && !existingQc[key]) qc[key] = true
  }

  const base = {
    version: 1 as const,
    id: req.existing?.id || newFigureId(),
    type: normalizeType(parsed.type || req.type),
    claim,
    layoutNotes: String(
      parsed.layoutNotes || parsed.layout || ""
    ).trim(),
    paradigm: String(parsed.paradigm || "").trim() || undefined,
    tool: String(parsed.tool || "").trim() || undefined,
    captionDraft: String(parsed.captionDraft || parsed.caption || "").trim() || undefined,
    panelPlan: String(parsed.panelPlan || parsed.panels || "").trim() || undefined,
    paletteNotes:
      String(parsed.paletteNotes || parsed.palette || "").trim() || undefined,
    deliverable: normalizeDeliverable(
      parsed.deliverable || req.deliverable || "design"
    ),
    dataPayload: String(req.dataPayload || req.existing?.dataPayload || "").trim() || undefined,
    chartSpec: normalizeChartSpec(parsed.chartSpec),
    codeArtifact:
      String(parsed.codeArtifact || parsed.code || "").trim() || undefined,
    codeLanguage:
      String(parsed.codeLanguage || req.codeLanguage || "").trim() || undefined,
    promptArtifact:
      String(parsed.promptArtifact || parsed.prompt || "").trim() || undefined,
    // Keep prior AI pixels unless a new prompt-only run explicitly clears them
    imageUrl: req.existing?.imageUrl,
    imageMime: req.existing?.imageMime,
    qc,
    locale,
    createdAt: new Date().toISOString()
  }

  if (!base.layoutNotes) {
    base.layoutNotes =
      locale === "zh"
        ? "（模型未返回布局说明，请重试或补充主张 / 笔记。）"
        : "(Model returned no layout notes — retry or refine the claim.)"
  }

  return {
    ...base,
    gates: buildFigureGates(base, { hasExperimentResults: hasResults })
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = (await request.json()) as FiguresRequest
    const locale = resolveLocale(json.locale)
    const deliverable = normalizeDeliverable(json.deliverable)

    if (!json.chatSettings || !json.provider) {
      return NextResponse.json(
        { message: "chatSettings and provider are required" },
        { status: 400 }
      )
    }

    const claim = String(json.claim || "").trim()
    if (!claim) {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? "请先填写本图要证明的主张"
              : "Provide the claim this figure must prove"
        },
        { status: 400 }
      )
    }

    if (deliverable === "render" && !String(json.dataPayload || "").trim()) {
      const fromExp = asArray(json.experimentRecord?.resultTables)
        .map(x => String(x || "").trim())
        .filter(Boolean)
        .join("\n\n")
      if (fromExp) {
        json.dataPayload = fromExp.slice(0, 12000)
      } else {
        return NextResponse.json(
          {
            message:
              locale === "zh"
                ? "渲染出图需要粘贴数据（CSV / JSON），或先在实验模块附上结果表"
                : "Render needs pasted data (CSV / JSON), or attach result tables in Experiment first"
          },
          { status: 400 }
        )
      }
    }

    json.type = normalizeType(json.type)
    json.deliverable = deliverable
    const prompt = buildPrompt(json, locale)
    const raw = await generateJsonContent(request, json, prompt, locale)
    const figure = parseBundle(raw, json, locale)

    return NextResponse.json({ figure })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Figures request failed"
    return NextResponse.json({ message }, { status: 500 })
  }
}
