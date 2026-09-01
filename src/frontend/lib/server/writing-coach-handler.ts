import { ChatSettings } from "@/types"
import type { ExperimentRecord } from "@/lib/experiment-types"
import type { IdeaCard } from "@/lib/idea-types"
import {
  applyScopedRewrite,
  buildWritingGates,
  emptyWritingBundle,
  normalizeWordLimit,
  type EvidenceLevel,
  type EvidenceMapItem,
  type PublicationMode,
  type ReviewCommentItem,
  type ScopedReviseOptions,
  type SemanticDiff,
  type StyleTier,
  type WritingBundle,
  type WritingMode,
  DRAFT_WRITING_MODES,
  POLISH_WRITING_MODES,
  WRITING_MODES,
  WRITING_SECTIONS
} from "@/lib/writing-types"
import {
  resolveWritingLocale,
  writingLanguageInstruction,
  writingModelHttpError,
  type WritingLocale
} from "@/lib/server/writing-locale"
import { loadInjectableFragment } from "@/lib/server/load-injectable"
import { loadSkillForMode } from "@/lib/server/load-skill"
import { NextRequest, NextResponse } from "next/server"

export type WritingCoachFamily = "writing" | "polish"

interface WritingRequest {
  mode: WritingMode
  section?: string
  publicationMode?: PublicationMode
  styleTier?: StyleTier
  forceEnglish?: boolean
  /** Max prose length; 0/omit = unlimited. Unit: words (EN) or chars (ZH). */
  wordLimit?: number | null
  userDraft?: string
  userMaterials?: string
  /** Point-by-point review comments for revise_feedback */
  reviewComments?: ReviewCommentItem[]
  /** Fine-grained revise controls for revise_scoped / polish */
  scoped?: ScopedReviseOptions
  literatureHints?: {
    topic?: string
    gaps?: string[]
    paperIds?: string[]
    abstracts?: string[]
  }
  ideaCard?: IdeaCard | null
  experimentRecord?: ExperimentRecord | null
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

function hasExperimentResults(record?: ExperimentRecord | null): boolean {
  if (!record) return false
  const logs = asArray(record.runLogs).some(x => String(x || "").trim())
  const tables = asArray(record.resultTables).some(x => String(x || "").trim())
  return logs || tables
}

function normalizeMode(raw: unknown): WritingMode {
  const v = String(raw || "outline")
  return (WRITING_MODES as string[]).includes(v) ? (v as WritingMode) : "outline"
}

function normalizeSection(raw: unknown): string | undefined {
  const v = String(raw || "").trim()
  if (!v) return undefined
  return (WRITING_SECTIONS as readonly string[]).includes(v) ? v : v.slice(0, 48)
}

function normalizeEvidenceMap(raw: unknown): EvidenceMapItem[] {
  return asArray(raw as EvidenceMapItem[])
    .map((e, i) => {
      const level = String(e?.level || "L3")
      return {
        id: String(e?.id || `E${i + 1}`).slice(0, 12),
        source: String(e?.source || "").trim(),
        level: (["L0", "L1", "L2", "L3"].includes(level)
          ? level
          : "L3") as EvidenceLevel,
        supports: String(e?.supports || "").trim(),
        cannotSupport: String(
          (e as EvidenceMapItem)?.cannotSupport ||
            (e as { cannot_support?: string })?.cannot_support ||
            ""
        ).trim()
      }
    })
    .filter(e => e.source || e.supports)
    .slice(0, 24)
}

function normalizeDiffs(raw: unknown): SemanticDiff[] {
  return asArray(raw as SemanticDiff[])
    .map(d => ({
      before: String(d?.before || "").trim(),
      after: String(d?.after || "").trim(),
      reason: String(d?.reason || "").trim(),
      commentId: d?.commentId ? String(d.commentId).trim() : undefined
    }))
    .filter(d => d.before && d.after)
    .slice(0, 30)
}

function normalizeReviewResponses(
  raw: unknown,
  seed?: ReviewCommentItem[]
): ReviewCommentItem[] {
  const fromModel = asArray(raw as ReviewCommentItem[]).map((r, i) => {
    const stance = String(r?.stance || "")
    const status = String(r?.status || "pending")
    return {
      id: String(r?.id || seed?.[i]?.id || `R${i + 1}`).slice(0, 12),
      text: String(r?.text || seed?.[i]?.text || "").trim(),
      stance: (["agree", "partial", "disagree"].includes(stance)
        ? stance
        : undefined) as ReviewCommentItem["stance"],
      action: r?.action ? String(r.action).trim() : undefined,
      status: (["pending", "applied", "skipped"].includes(status)
        ? status
        : "pending") as ReviewCommentItem["status"]
    }
  })
  if (fromModel.length) return fromModel.filter(r => r.text).slice(0, 30)
  return asArray(seed)
    .map((r, i) => ({
      id: String(r.id || `R${i + 1}`),
      text: String(r.text || "").trim(),
      stance: r.stance,
      action: r.action,
      status: r.status || ("pending" as const)
    }))
    .filter(r => r.text)
    .slice(0, 30)
}

function normalizeBundle(
  parsed: Record<string, unknown>,
  req: WritingRequest,
  locale: WritingLocale
): WritingBundle {
  const publicationMode: PublicationMode =
    req.publicationMode === "final" ? "final" : "draft"
  const styleTier = (["academic", "ml_conference", "nature_like"].includes(
    String(req.styleTier)
  )
    ? req.styleTier
    : "academic") as StyleTier

  let content = String(
    parsed.content || parsed.prose || parsed.outline || ""
  ).trim()

  // Scoped mode may return only the rewritten span
  const scopedTarget = req.scoped?.targetText?.trim()
  const rewrittenSpan = String(
    parsed.rewrittenSpan || parsed.rewritten || ""
  ).trim()
  if (
    req.mode === "revise_scoped" &&
    rewrittenSpan &&
    req.userDraft
  ) {
    content = applyScopedRewrite(
      req.userDraft,
      scopedTarget,
      rewrittenSpan
    )
  }

  const base: Omit<WritingBundle, "gates"> = {
    version: 1,
    mode: normalizeMode(req.mode),
    section: normalizeSection(req.section || parsed.section),
    content,
    evidenceMap: normalizeEvidenceMap(parsed.evidenceMap || parsed.evidence_map),
    pendingSemanticDiffs: normalizeDiffs(
      parsed.pendingSemanticDiffs || parsed.semanticDiffs || parsed.diffs
    ),
    reviewResponses: normalizeReviewResponses(
      parsed.reviewResponses || parsed.responses,
      req.reviewComments
    ),
    publicationMode,
    styleTier,
    wordLimit: normalizeWordLimit(req.wordLimit),
    locale: req.forceEnglish ? "en" : locale,
    createdAt: new Date().toISOString()
  }

  return {
    ...base,
    gates: buildWritingGates(base, {
      hasExperimentResults: hasExperimentResults(req.experimentRecord)
    })
  }
}

function fallbackBundle(
  req: WritingRequest,
  locale: WritingLocale,
  issue?: string
): WritingBundle {
  const zh = locale === "zh"
  const content = zh
    ? `（占位大纲）\n\n1. 问题与动机\n2. 相关工作缺口\n3. 方法要点\n4. 实验计划\n5. 预期贡献\n\n${issue ? `注意：${issue}` : "模型未返回可用正文，请重试。"}`
    : `(Placeholder outline)\n\n1. Problem & motivation\n2. Related-work gap\n3. Method sketch\n4. Experiment plan\n5. Expected contribution\n\n${issue ? `Note: ${issue}` : "Model returned no usable prose — please retry."}`

  return emptyWritingBundle(req.forceEnglish ? "en" : locale, {
    mode: normalizeMode(req.mode),
    section: normalizeSection(req.section),
    content,
    publicationMode: req.publicationMode === "final" ? "final" : "draft",
    styleTier: (req.styleTier as StyleTier) || "academic",
    wordLimit: normalizeWordLimit(req.wordLimit),
    evidenceMap: [],
    pendingSemanticDiffs: []
  })
}

function buildPrompt(
  req: WritingRequest,
  locale: WritingLocale,
  family: WritingCoachFamily
): string {
  const mode = normalizeMode(req.mode)
  const injectable = loadInjectableFragment(
    family === "polish" ? "polish" : "writing"
  )
  const skill = loadSkillForMode(req.mode)
  const pub = req.publicationMode === "final" ? "final" : "draft"
  const style = req.styleTier || "academic"
  const hasResults = hasExperimentResults(req.experimentRecord)

  const lit = req.literatureHints || {}
  const idea = req.ideaCard
  const exp = req.experimentRecord

  const ideaBlock = idea
    ? JSON.stringify(
        {
          title: idea.title,
          oneLiner: idea.oneLiner,
          paperType: idea.paperType,
          researchQuestions: idea.researchQuestions,
          hypotheses: idea.hypotheses,
          verdict: idea.verdict
        },
        null,
        2
      )
    : "(none)"

  const expBlock = exp
    ? JSON.stringify(
        {
          status: exp.status,
          hypotheses: exp.hypotheses,
          baselines: exp.baselines,
          datasets: exp.datasets,
          metrics: exp.metrics,
          hasRunLogs: Boolean(asArray(exp.runLogs).length),
          hasResultTables: Boolean(asArray(exp.resultTables).length),
          interpretation: exp.interpretation || null
        },
        null,
        2
      )
    : "(none)"

  const modeInstructions: Record<WritingMode, string> = {
    outline:
      "Produce a paper outline only: section titles + per-section evidence needs. Do NOT write full prose paragraphs.",
    draft_section: `Draft the single section "${req.section || "method"}" with evidence-gated citations to paper ids when available.`,
    intro:
      "Draft an Introduction using the six-paragraph intro flowchart (context → gap → challenge → approach → results preview → contributions). Results preview must be planned language if Final=false or no experiment results.",
    polish:
      "Polish the USER DRAFT: fix grammar and AI tone. List EVERY meaning change in pendingSemanticDiffs. Do not silently change scientific claims.",
    nature_style:
      "Write Nature-like concise Abstract / Intro / Discussion tone for the requested section (or abstract if unspecified). Short sentences, high information density, no hype.",
    revise_feedback:
      "Revise USER DRAFT against each REVIEW COMMENT. For every comment: choose stance agree|partial|disagree, propose an action, and produce a semantic diff (before/after) with commentId. Return full revised content. Do not invent new scientific claims.",
    revise_scoped:
      "Revise ONLY the TARGET SPAN (or whole draft if target empty) per USER INSTRUCTION. If preserveClaims=true, do not change numbers, contribution claims, or experimental assertions—only clarity/structure/grammar. Prefer returning rewrittenSpan for the target plus pendingSemanticDiffs; also return full content."
  }

  const comments = asArray(req.reviewComments)
  const scoped = req.scoped || {}

  return `${injectable}

${skill ? `--- SKILL ---\n${skill.slice(0, 28000)}\n--- END SKILL ---\n` : ""}

MODE: ${mode}
${modeInstructions[mode]}

PUBLICATION MODE: ${pub}
${
  pub === "final"
    ? "Final: only claims supported by attached experiment evidence or user materials. No planned-result masquerading as completed."
    : "Draft: may discuss planned/expected measurements with explicit 'if/then' framing."
}
STYLE TIER: ${style}
HAS EXPERIMENT RESULTS: ${hasResults ? "yes" : "no"}
PRESERVE CLAIMS: ${scoped.preserveClaims ? "YES — do not alter scientific claims/numbers" : "no"}
${
  normalizeWordLimit(req.wordLimit)
    ? `LENGTH CAP: ${normalizeWordLimit(req.wordLimit)} ${
        req.forceEnglish || locale === "en" ? "words" : "characters (non-whitespace)"
      }. Stay within this cap. Prefer cutting fluff over dropping claims; if polish/revise would exceed, shorten.`
    : "LENGTH CAP: none"
}

${writingLanguageInstruction(locale, req.forceEnglish)}
UI locale: ${locale}

LITERATURE TOPIC: ${lit.topic || "(none)"}
GAPS:
${asArray(lit.gaps).length ? lit.gaps!.map((g, i) => `${i + 1}. ${g}`).join("\n") : "(none)"}
PAPER IDS: ${asArray(lit.paperIds).join(", ") || "(none)"}
ABSTRACT SNIPPETS:
${asArray(lit.abstracts).slice(0, 8).join("\n---\n") || "(none)"}

IDEA CARD:
${ideaBlock}

EXPERIMENT RECORD (summary):
${expBlock}

USER MATERIALS:
${(req.userMaterials || "").slice(0, 16000) || "(none)"}

USER DRAFT (for polish / revise):
${(req.userDraft || "").slice(0, 16000) || "(none)"}

TARGET SPAN (revise_scoped; empty = whole draft):
${(scoped.targetText || "").slice(0, 8000) || "(none — revise whole draft)"}

USER INSTRUCTION (revise_scoped / optional polish hint):
${(scoped.instruction || "").slice(0, 4000) || "(none)"}

REVIEW COMMENTS (revise_feedback):
${
  comments.length
    ? comments
        .map((c, i) => `${c.id || `R${i + 1}`}: ${c.text}`)
        .join("\n")
    : "(none)"
}

Rules:
1. Build evidenceMap before/with the prose (id, source, level L0–L3, supports, cannotSupport).
2. Cite only paper ids from PAPER IDS or sources named in USER MATERIALS — never invent papers.
3. No placeholder brackets in content.
4. polish / revise_*: return pendingSemanticDiffs for every meaning change (include commentId when from a review comment).
5. revise_feedback: return reviewResponses aligned to each comment id.
6. revise_scoped: if TARGET SPAN is set, rewrite only that span; return rewrittenSpan and full content with the span replaced.
7. Never claim numeric experimental results unless HAS EXPERIMENT RESULTS is yes or USER MATERIALS contain them.

Return ONLY valid JSON:
{
  "section": "${req.section || ""}",
  "content": "full markdown prose after revision",
  "rewrittenSpan": "only for revise_scoped when target span set",
  "evidenceMap": [
    {
      "id": "E1",
      "source": "paper id or user material",
      "level": "L1|L2|L3|L0",
      "supports": "...",
      "cannotSupport": "..."
    }
  ],
  "pendingSemanticDiffs": [
    { "before": "...", "after": "...", "reason": "...", "commentId": "R1" }
  ],
  "reviewResponses": [
    {
      "id": "R1",
      "text": "original comment",
      "stance": "agree|partial|disagree",
      "action": "what you changed",
      "status": "applied|pending|skipped"
    }
  ]
}`
}

async function generateJsonContent(
  request: NextRequest,
  json: WritingRequest,
  prompt: string,
  locale: WritingLocale
): Promise<string> {
  const temperature = Math.min(
    Math.max(json.chatSettings.temperature ?? 0.45, 0.2),
    0.75
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
              "You are a strict JSON generator for MentorOS drafting/polish coach. Output one valid JSON object only."
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
              "You generate strictly valid JSON for MentorOS drafting or polish modules. Obey evidence discipline; never invent citations or results."
          },
          { role: "user", content: prompt }
        ]
      }),
      signal: AbortSignal.timeout(180000)
    }
  )

  if (!generateResponse.ok) {
    throw new Error(writingModelHttpError(locale, generateResponse.status))
  }

  const { content } = (await generateResponse.json()) as { content: string }
  return content
}

/** Shared handler for /api/writing (draft) and /api/polish (revise). */
export async function handleWritingCoachRequest(
  request: NextRequest,
  family: WritingCoachFamily
): Promise<NextResponse> {
  try {
    const json = (await request.json()) as WritingRequest
    const locale = resolveWritingLocale(json.locale)
    const mode = normalizeMode(json.mode)

    const allowed =
      family === "polish" ? POLISH_WRITING_MODES : DRAFT_WRITING_MODES
    if (!(allowed as string[]).includes(mode)) {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? family === "polish"
                ? "该模式属于撰写模块，请使用 /api/writing"
                : "该模式属于润色模块，请使用 /api/polish"
              : family === "polish"
                ? "That mode belongs to drafting — use /api/writing"
                : "That mode belongs to polish — use /api/polish"
        },
        { status: 400 }
      )
    }

    if (!json.chatSettings || !json.provider) {
      return NextResponse.json(
        { message: "chatSettings and provider are required" },
        { status: 400 }
      )
    }

    if (family === "polish" && !String(json.userDraft || "").trim()) {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? "改稿/润色需要先有草稿正文"
              : "Revise/polish requires an existing draft"
        },
        { status: 400 }
      )
    }

    if (
      mode === "revise_feedback" &&
      !asArray(json.reviewComments).some(c => String(c?.text || "").trim())
    ) {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? "请先粘贴或录入审稿意见"
              : "Add review comments before revise-from-feedback"
        },
        { status: 400 }
      )
    }

    if (
      mode === "revise_scoped" &&
      !String(json.scoped?.instruction || "").trim()
    ) {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? "细粒度改稿需要填写修改指令"
              : "Scoped revise requires an instruction"
        },
        { status: 400 }
      )
    }

    const hasContext =
      String(json.userMaterials || "").trim() ||
      String(json.userDraft || "").trim() ||
      json.ideaCard ||
      json.experimentRecord ||
      json.literatureHints?.topic ||
      asArray(json.literatureHints?.gaps).length ||
      asArray(json.literatureHints?.paperIds).length ||
      asArray(json.reviewComments).length

    if (!hasContext) {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? family === "polish"
                ? "请先载入或粘贴初稿"
                : "请先导入文献/Idea/实验，或粘贴写作材料"
              : family === "polish"
                ? "Load or paste a draft first"
                : "Import Literature/Idea/Experiment context, or paste writing materials first"
        },
        { status: 400 }
      )
    }

    const prompt = buildPrompt({ ...json, mode }, locale, family)

    try {
      const content = await generateJsonContent(request, json, prompt, locale)
      if (!content?.trim()) {
        return NextResponse.json({
          bundle: fallbackBundle(
            json,
            locale,
            locale === "zh" ? "模型返回为空" : "Empty model response"
          )
        })
      }
      const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>
      const bundle = normalizeBundle(parsed, { ...json, mode }, locale)
      if (!bundle.content.trim()) {
        return NextResponse.json({
          bundle: fallbackBundle(
            json,
            locale,
            locale === "zh" ? "解析后正文为空" : "Empty content after parse"
          ),
          warning:
            locale === "zh"
              ? "解析后无正文，已返回占位大纲"
              : "No prose after parse; returned placeholder outline"
        })
      }
      return NextResponse.json({ bundle })
    } catch (error: any) {
      return NextResponse.json({
        bundle: fallbackBundle(
          json,
          locale,
          error?.message || "writing failed"
        ),
        warning:
          locale === "zh"
            ? "生成失败，已返回可编辑占位结果"
            : "Generation failed; returned editable placeholder"
      })
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        message:
          error?.message ||
          (family === "polish"
            ? "Polish request failed"
            : "Writing request failed")
      },
      { status: 500 }
    )
  }
}
