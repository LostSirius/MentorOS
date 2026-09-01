import { ChatSettings } from "@/types"
import {
  emptyScores,
  type FatalFlaw,
  type GateResult,
  type IdeaCandidate,
  type IdeaCard,
  type IdeaCapability,
  type IdeaPaperType,
  type IdeaScores,
  type IdeaVerdict,
  type ResearchQuestion,
  PAPER_TYPES,
  SCORE_KEYS
} from "@/lib/idea-types"
import {
  ideaLanguageInstruction,
  ideaModelHttpError,
  resolveIdeaLocale,
  type IdeaLocale
} from "@/lib/server/idea-locale"
import { loadInjectableFragment } from "@/lib/server/load-injectable"
import { loadSkillForMode } from "@/lib/server/load-skill"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type IdeaPhase = "brainstorm" | "evaluate"

interface IdeaRequest {
  phase: IdeaPhase
  seed: string
  /** Extra document body (uploads / long paste) for evaluation context */
  documentContext?: string
  gaps?: string[]
  researchQuestions?: string[]
  literatureTopic?: string
  candidate?: IdeaCandidate
  capability?: IdeaCapability
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

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n)
  if (!Number.isFinite(v)) return 3
  return Math.min(5, Math.max(1, Math.round(v)))
}

/** Accept nested {score,rationale}, plain numbers, or alternate field names. */
function parseDimensionScore(
  raw: unknown,
  fallbackRationale: string
): { score: number; rationale: string; found: boolean } {
  if (raw == null) {
    return { score: 3, rationale: fallbackRationale, found: false }
  }
  if (typeof raw === "number" || typeof raw === "string") {
    const n = Number(raw)
    if (Number.isFinite(n)) {
      return {
        score: clampScore(n),
        rationale: fallbackRationale,
        found: true
      }
    }
    return { score: 3, rationale: fallbackRationale, found: false }
  }
  if (typeof raw !== "object") {
    return { score: 3, rationale: fallbackRationale, found: false }
  }
  const obj = raw as Record<string, unknown>
  const scoreRaw =
    obj.score ??
    obj.value ??
    obj.rating ??
    obj.points ??
    obj.s ??
    obj["分数"] ??
    obj["评分"]
  const rationaleRaw =
    obj.rationale ??
    obj.reason ??
    obj.explanation ??
    obj.mechanism ??
    obj.detail ??
    obj["理由"] ??
    obj["机制"]
  const hasScore = scoreRaw != null && Number.isFinite(Number(scoreRaw))
  return {
    score: hasScore ? clampScore(scoreRaw) : 3,
    rationale: String(rationaleRaw || fallbackRationale).trim(),
    found: hasScore
  }
}

const SCORE_KEY_ALIASES: Record<string, (typeof SCORE_KEYS)[number]> = {
  higher: "higher",
  faster: "faster",
  stronger: "stronger",
  cheaper: "cheaper",
  broader: "broader",
  effectiveness: "higher",
  quality: "higher",
  speed: "faster",
  latency: "faster",
  robustness: "stronger",
  reliability: "stronger",
  cost: "cheaper",
  generality: "broader",
  generalization: "broader",
  coverage: "broader",
  更高: "higher",
  效果: "higher",
  更快: "faster",
  速度: "faster",
  更稳: "stronger",
  更强: "stronger",
  鲁棒: "stronger",
  更省: "cheaper",
  成本: "cheaper",
  更广: "broader",
  泛化: "broader"
}

function normalizeScores(raw: unknown, locale: IdeaLocale): IdeaScores {
  const fallback = emptyScores(
    locale === "zh" ? "模型未给出机制理由" : "No mechanism rationale returned"
  )
  if (!raw) return fallback

  // Unwrap common alternate envelopes
  let payload: unknown = raw
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>
    payload =
      obj.higher != null || obj.faster != null
        ? payload
        : obj.dimensions ||
          obj.dimensionScores ||
          obj.radar ||
          obj.fiveDimensions ||
          obj.axes ||
          payload
  }

  const bucket: Partial<
    Record<(typeof SCORE_KEYS)[number], { score: number; rationale: string }>
  > = {}

  const take = (key: (typeof SCORE_KEYS)[number], value: unknown) => {
    const parsed = parseDimensionScore(value, fallback[key].rationale)
    if (!parsed.found && bucket[key]?.score != null) return
    bucket[key] = {
      score: parsed.found ? parsed.score : bucket[key]?.score ?? 3,
      rationale: parsed.rationale || fallback[key].rationale
    }
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (!item || typeof item !== "object") continue
      const row = item as Record<string, unknown>
      const dimLabel = String(
        row.dimension || row.key || row.name || row.id || row.axis || ""
      ).trim()
      const mapped =
        SCORE_KEY_ALIASES[dimLabel] ||
        SCORE_KEY_ALIASES[dimLabel.toLowerCase()]
      if (mapped) take(mapped, row)
    }
  } else if (typeof payload === "object" && payload) {
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      const mapped =
        SCORE_KEY_ALIASES[k] ||
        SCORE_KEY_ALIASES[k.toLowerCase()] ||
        (SCORE_KEYS.includes(k as (typeof SCORE_KEYS)[number])
          ? (k as (typeof SCORE_KEYS)[number])
          : undefined)
      if (mapped) take(mapped, v)
    }
  }

  if (Object.keys(bucket).length === 0) return fallback
  const out = { ...fallback }
  for (const key of SCORE_KEYS) {
    if (bucket[key]) out[key] = bucket[key]!
  }
  return out
}

/** Detect copied example profile or all-identical collapsed scores. */
function scoresLookCollapsed(scores: IdeaScores): boolean {
  const vals = SCORE_KEYS.map(k => scores[k].score)
  const allSame = vals.every(v => v === vals[0])
  const matchesExample =
    vals[0] === 4 &&
    vals[1] === 3 &&
    vals[2] === 2 &&
    vals[3] === 4 &&
    vals[4] === 3
  return allSame || matchesExample
}

function normalizePaperType(raw: unknown): IdeaPaperType {
  const v = String(raw || "other")
  return (PAPER_TYPES as string[]).includes(v)
    ? (v as IdeaPaperType)
    : "other"
}

function normalizeVerdict(raw: unknown): IdeaVerdict {
  const v = String(raw || "")
  if (v === "strong_accept" || v === "accept_with_revisions" || v === "reject_and_pivot")
    return v
  return "accept_with_revisions"
}

function normalizeFlaws(raw: unknown): FatalFlaw[] {
  return asArray(raw as FatalFlaw[])
    .map((f, i): FatalFlaw => ({
      id: String(f?.id || `F${i + 1}`).slice(0, 8),
      severity: f?.severity === "MAJOR" ? ("MAJOR" as const) : ("FATAL" as const),
      detail: String(f?.detail || "").trim(),
      mitigation: f?.mitigation ? String(f.mitigation).trim() : undefined
    }))
    .filter(f => f.detail)
    .slice(0, 4)
}

function normalizeRQs(raw: unknown): ResearchQuestion[] {
  return asArray(raw as ResearchQuestion[])
    .map((q, i) => ({
      id: String(q?.id || `RQ${i + 1}`),
      text: String(q?.text || "").trim(),
      locked: Boolean(q?.locked)
    }))
    .filter(q => q.text)
    .slice(0, 5)
}

function buildGates(card: Omit<IdeaCard, "gates">): GateResult[] {
  const gates: GateResult[] = []
  const fatals = card.fatalFlaws.filter(f => f.severity === "FATAL")
  const unmitigated = fatals.filter(f => !f.mitigation)
  if (fatals.length >= 2) {
    gates.push({
      id: "too-many-fatals",
      severity: "BLOCK",
      message:
        card.locale === "zh"
          ? "致命缺陷 ≥2，应 Pivot 而非强行推进"
          : "Two or more FATAL flaws — pivot rather than force ahead",
      fixHint:
        card.locale === "zh"
          ? "缩小问题或更换贡献类型后重新评估"
          : "Narrow the problem or change contribution type, then re-evaluate"
    })
  } else if (unmitigated.length > 0) {
    gates.push({
      id: "fatal-unmitigated",
      severity: "BLOCK",
      message:
        card.locale === "zh"
          ? "存在未缓解的致命缺陷，默认不可进入实验"
          : "Unmitigated FATAL flaw(s) — blocked from experiment by default",
      fixHint:
        card.locale === "zh"
          ? "补充缓解方案，或强制确认后继续"
          : "Add mitigations, or force-confirm to continue"
    })
  }
  if (!card.researchQuestions.length) {
    gates.push({
      id: "missing-rq",
      severity: "BLOCK",
      message:
        card.locale === "zh"
          ? "缺少可证伪研究问题"
          : "Missing falsifiable research question(s)"
    })
  }
  if (!card.hypotheses.length) {
    gates.push({
      id: "missing-hypothesis",
      severity: "WARN",
      message:
        card.locale === "zh" ? "缺少可检验假设" : "Missing testable hypotheses"
    })
  }
  const top = Math.max(...SCORE_KEYS.map(k => card.scores[k].score))
  if (top < 4 && card.verdict === "strong_accept") {
    gates.push({
      id: "weak-scores",
      severity: "WARN",
      message:
        card.locale === "zh"
          ? "五维均未突出，Strong Accept 偏乐观"
          : "No dimension stands out (≥4); Strong Accept may be optimistic"
    })
  }
  if (scoresLookCollapsed(card.scores)) {
    gates.push({
      id: "collapsed-scores",
      severity: "WARN",
      message:
        card.locale === "zh"
          ? "五维分数过于雷同或疑似照抄模板，请重新评估以区分优劣"
          : "Scores look collapsed or template-like; re-evaluate for differentiated judgments"
    })
  }
  if (gates.length === 0) {
    gates.push({
      id: "clear",
      severity: "CLEAR",
      message: card.locale === "zh" ? "门禁通过" : "Gates clear"
    })
  }
  return gates
}

function normalizeCandidates(
  raw: unknown,
  locale: IdeaLocale
): IdeaCandidate[] {
  void locale
  let list: IdeaCandidate[] = []
  if (Array.isArray(raw)) {
    list = raw as IdeaCandidate[]
  } else if (raw && typeof raw === "object" && Array.isArray((raw as any).candidates)) {
    list = (raw as { candidates: IdeaCandidate[] }).candidates
  }
  return list
    .map((c, i) => ({
      id: String(c?.id || `C${i + 1}`),
      title: String(c?.title || "").trim(),
      oneLiner: String(c?.oneLiner || "").trim(),
      paperType: normalizePaperType(c?.paperType),
      inspiration: c?.inspiration ? String(c.inspiration).trim() : undefined,
      notes: c?.notes ? String(c.notes).trim() : undefined,
      source: (c?.source as IdeaCandidate["source"]) || "brainstorm"
    }))
    .filter(c => c.title && c.oneLiner)
    .slice(0, 7)
}

function fallbackCandidates(
  seed: string,
  gaps: string[],
  locale: IdeaLocale
): IdeaCandidate[] {
  const axes =
    locale === "zh"
      ? [
          {
            title: `更高：强化「${seed.slice(0, 28)}」效果轴`,
            type: "novel_method" as const,
            line: "相对强基线提升主指标，并给出可检验机制。"
          },
          {
            title: `更省：降低「${seed.slice(0, 28)}」成本`,
            type: "novel_method" as const,
            line: "在相近效果下显著降低算力/标注/数据需求。"
          },
          {
            title: `更广：统一相关任务设定`,
            type: "new_setting" as const,
            line: "用同一框架覆盖更多任务或模态，避免锤子找钉子。"
          },
          {
            title: gaps[0]
              ? `针对缺口：${gaps[0].slice(0, 40)}`
              : "新问题：现有方法失败模式",
            type: "novel_problem" as const,
            line: "从真实失败模式出发定义新问题，而不是先定技术。"
          }
        ]
      : [
          {
            title: `Higher: boost effectiveness for “${seed.slice(0, 36)}”`,
            type: "novel_method" as const,
            line: "Beat a strong baseline on the primary metric with a clear mechanism."
          },
          {
            title: `Cheaper: cut cost for “${seed.slice(0, 36)}”`,
            type: "novel_method" as const,
            line: "Match near-SOTA quality at materially lower compute/annotation cost."
          },
          {
            title: "Broader: unify related task settings",
            type: "new_setting" as const,
            line: "One framework across more tasks/modalities without hammer-looking-for-nail."
          },
          {
            title: gaps[0]
              ? `Gap-driven: ${gaps[0].slice(0, 48)}`
              : "Novel problem from failure modes",
            type: "novel_problem" as const,
            line: "Define the problem from real failure cases, not from a preferred technique."
          }
        ]

  return axes.map((a, i) => ({
    id: `C${i + 1}`,
    title: a.title,
    oneLiner: a.line,
    paperType: a.type,
    inspiration: gaps[i] || gaps[0] || seed.slice(0, 80)
  }))
}

function normalizeIdeaCard(
  parsed: Record<string, unknown>,
  candidate: IdeaCandidate,
  locale: IdeaLocale
): IdeaCard {
  const base: Omit<IdeaCard, "gates"> = {
    version: 1,
    candidateId: candidate.id,
    title: String(parsed.title || candidate.title).trim(),
    oneLiner: String(parsed.oneLiner || candidate.oneLiner).trim(),
    paperType: normalizePaperType(parsed.paperType || candidate.paperType),
    researchQuestions: normalizeRQs(parsed.researchQuestions),
    hypotheses: asArray(parsed.hypotheses as string[])
      .map(h => String(h).trim())
      .filter(Boolean)
      .slice(0, 5),
    scores: normalizeScores(parsed.scores, locale),
    fatalFlaws: normalizeFlaws(parsed.fatalFlaws),
    capabilityFit: parsed.capabilityFit
      ? String(parsed.capabilityFit).trim()
      : undefined,
    venueSuggestion: parsed.venueSuggestion
      ? String(parsed.venueSuggestion).trim()
      : undefined,
    revisionAdvice: asArray(parsed.revisionAdvice as string[])
      .map(s => String(s).trim())
      .filter(Boolean)
      .slice(0, 6),
    verdict: normalizeVerdict(parsed.verdict),
    locale,
    createdAt: new Date().toISOString()
  }

  if (!base.researchQuestions.length) {
    base.researchQuestions = [
      {
        id: "RQ1",
        text:
          locale === "zh"
            ? `在可比设定下，相对强基线，所提方法能否显著改进核心指标？`
            : `Under a comparable setting, does the proposed approach significantly improve the primary metric versus a strong baseline?`
      }
    ]
  }
  if (!base.hypotheses.length) {
    base.hypotheses = [
      locale === "zh"
        ? "H1：相对指定强基线，主指标将出现可复现的显著提升。"
        : "H1: Relative to a named strong baseline, the primary metric will show a reproducible significant gain."
    ]
  }

  // Enforce fatal → verdict mapping lightly
  const fatalCount = base.fatalFlaws.filter(f => f.severity === "FATAL").length
  if (fatalCount >= 2) base.verdict = "reject_and_pivot"
  else if (fatalCount === 1 && base.verdict === "strong_accept")
    base.verdict = "accept_with_revisions"

  return { ...base, gates: buildGates(base) }
}

function fallbackEvaluation(
  candidate: IdeaCandidate,
  locale: IdeaLocale,
  issue?: string
): IdeaCard {
  const scores = emptyScores(
    locale === "zh"
      ? "评估未完成，分数为占位，请重试。"
      : "Evaluation incomplete; placeholder scores — please retry."
  )
  const base: Omit<IdeaCard, "gates"> = {
    version: 1,
    candidateId: candidate.id,
    title: candidate.title,
    oneLiner: candidate.oneLiner,
    paperType: candidate.paperType,
    researchQuestions: [
      {
        id: "RQ1",
        text:
          locale === "zh"
            ? `该想法能否在明确设定下被实验证伪或支持？`
            : `Can this idea be falsified or supported under a clearly specified experimental setting?`
      }
    ],
    hypotheses: [
      locale === "zh"
        ? "H1：在对照设定下，主指标相对基线出现可测量差异。"
        : "H1: Under a controlled setting, the primary metric differs measurably from the baseline."
    ],
    scores,
    fatalFlaws: issue
      ? [
          {
            id: "F6",
            severity: "MAJOR",
            detail: issue,
            mitigation:
              locale === "zh" ? "重新运行评估" : "Re-run evaluation"
          }
        ]
      : [],
    capabilityFit:
      locale === "zh"
        ? "能力匹配待评估完成后填写。"
        : "Capability fit pending a successful evaluation.",
    venueSuggestion:
      locale === "zh" ? "待评估后建议会场" : "Venue pending evaluation",
    revisionAdvice: [
      locale === "zh"
        ? "完善一句话故事与可证伪 RQ 后重试评估"
        : "Refine the one-liner and falsifiable RQ, then re-evaluate"
    ],
    verdict: "accept_with_revisions",
    locale,
    createdAt: new Date().toISOString()
  }
  return { ...base, gates: buildGates(base) }
}

function buildBrainstormPrompt(
  seed: string,
  gaps: string[],
  rqs: string[],
  literatureTopic: string | undefined,
  locale: IdeaLocale
): string {
  const injectable = loadInjectableFragment("idea")
  const skill = loadSkillForMode("brainstorm")
  return `${injectable}

${skill ? `--- SKILL ---\n${skill}\n--- END SKILL ---\n` : ""}

PHASE: A · Brainstorm only. Do NOT issue a final verdict or five-dimension scores.

${ideaLanguageInstruction(locale)}
UI locale: ${locale}

USER SEED:
${seed}

LITERATURE TOPIC (optional): ${literatureTopic || "(none)"}

GAPS:
${gaps.length ? gaps.map((g, i) => `${i + 1}. ${g}`).join("\n") : "(none)"}

RESEARCH QUESTIONS:
${rqs.length ? rqs.map((q, i) => `${i + 1}. ${q}`).join("\n") : "(none)"}

Generate 4–6 diverse candidate ideas spanning Higher / Faster / Stronger / Cheaper / Broader axes and gap-driven novel problems. Avoid duplicates.

Return ONLY valid JSON:
{
  "candidates": [
    {
      "id": "C1",
      "title": "short title",
      "oneLiner": "one-sentence story",
      "paperType": "novel_problem|novel_method|new_setting|other",
      "inspiration": "which gap/RQ/axis"
    }
  ]
}`
}

function buildEvaluatePrompt(
  seed: string,
  candidate: IdeaCandidate,
  capability: IdeaCapability | undefined,
  gaps: string[],
  locale: IdeaLocale,
  documentContext?: string
): string {
  const injectable = loadInjectableFragment("idea")
  const skill = loadSkillForMode("evaluator")
  const cap = capability || {}
  const fullDoc = [
    candidate.notes?.trim(),
    documentContext?.trim(),
    seed.trim() !== candidate.oneLiner ? seed.trim() : ""
  ]
    .filter(Boolean)
    .join("\n\n---\n\n")
    .slice(0, 22000)

  return `${injectable}

${skill ? `--- SKILL ---\n${skill}\n--- END SKILL ---\n` : ""}

PHASE: B · Evaluate the selected candidate / imported proposal. Follow fatal-flaw audit BEFORE scoring.
If a FULL PROPOSAL DOCUMENT is provided, ground the evaluation in that document (do not invent experiments or results not stated there).

${ideaLanguageInstruction(locale)}
UI locale: ${locale}

USER SEED / SHORT CONTEXT:
${seed.slice(0, 4000) || "(see document / candidate)"}

SELECTED CANDIDATE:
${JSON.stringify(
  {
    id: candidate.id,
    title: candidate.title,
    oneLiner: candidate.oneLiner,
    paperType: candidate.paperType,
    inspiration: candidate.inspiration,
    source: candidate.source || "unknown"
  },
  null,
  2
)}

FULL PROPOSAL DOCUMENT (imported text / file; may be empty):
${fullDoc || "(none — evaluate from candidate one-liner only)"}

CAPABILITY / TIME:
- hoursPerWeek: ${cap.hoursPerWeek ?? "unspecified"}
- compute: ${cap.compute || "unspecified"}
- deadlineWeeks: ${cap.deadlineWeeks ?? "unspecified"}
- notes: ${cap.notes || "(none)"}

RELATED GAPS:
${gaps.length ? gaps.map((g, i) => `${i + 1}. ${g}`).join("\n") : "(none)"}

Rules:
1. One-sentence story + paper type (infer from the document when possible).
2. Fatal flaws F1–F10 first; max two FATAL; more => reject_and_pivot.
3. Score Higher/Faster/Stronger/Cheaper/Broader vs a named strong baseline (integers 1–5).
   - Scores MUST differ across dimensions when evidence differs — do NOT give five identical scores.
   - Do NOT copy any example numbers from this prompt; judge THIS candidate only.
   - Each rationale must cite a concrete mechanism or failure mode for THIS idea (not generic praise).
4. Capability/time + venue suggestion.
5. Verdict: strong_accept | accept_with_revisions | reject_and_pivot.
6. Force falsifiable researchQuestions and hypotheses.
7. Never claim experimental proof the user did not provide in the document.

Return ONLY valid JSON with this shape (example scores are ILLUSTRATIVE — invent new 1–5 scores for THIS idea; never reuse 4/3/2/4/3):
{
  "title": "...",
  "oneLiner": "...",
  "paperType": "novel_problem|novel_method|new_setting|other",
  "researchQuestions": [{ "id": "RQ1", "text": "falsifiable question" }],
  "hypotheses": ["H1: ..."],
  "scores": {
    "higher": { "score": 1, "rationale": "mechanism vs strong baseline for THIS idea" },
    "faster": { "score": 1, "rationale": "..." },
    "stronger": { "score": 1, "rationale": "..." },
    "cheaper": { "score": 1, "rationale": "..." },
    "broader": { "score": 1, "rationale": "..." }
  },
  "fatalFlaws": [
    { "id": "F1", "severity": "FATAL|MAJOR", "detail": "...", "mitigation": "..." }
  ],
  "capabilityFit": "...",
  "venueSuggestion": "...",
  "revisionAdvice": ["..."],
  "verdict": "strong_accept|accept_with_revisions|reject_and_pivot"
}`
}

async function generateJsonContent(
  request: NextRequest,
  json: IdeaRequest,
  prompt: string,
  locale: IdeaLocale,
  options?: { temperature?: number }
): Promise<string> {
  const temperature = Math.min(
    Math.max(options?.temperature ?? json.chatSettings.temperature ?? 0.45, 0.2),
    0.85
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
        options: {
          temperature
        },
        messages: [
          {
            role: "system",
            content:
              "You are a strict JSON generator. Output one valid JSON object only. No Markdown, no code fences, no <think>."
          },
          { role: "user", content: prompt }
        ]
      }),
      signal: AbortSignal.timeout(120000)
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
        chatSettings: {
          ...json.chatSettings,
          temperature
        },
        provider: json.provider,
        customModelId: json.customModelId,
        messages: [
          {
            role: "system",
            content:
              "You generate strictly valid JSON for MentorOS Idea Inspiration & Evaluation. Scores must be idea-specific integers 1–5 with distinct dimensions when warranted."
          },
          { role: "user", content: prompt }
        ]
      }),
      signal: AbortSignal.timeout(120000)
    }
  )

  if (!generateResponse.ok) {
    throw new Error(ideaModelHttpError(locale, generateResponse.status))
  }

  const { content } = (await generateResponse.json()) as { content: string }
  return content
}

export async function POST(request: NextRequest) {
  try {
    const json = (await request.json()) as IdeaRequest
    const locale = resolveIdeaLocale(json.locale)
    const documentContext = String(json.documentContext || "").trim()
    const seed =
      String(json.seed || "").trim() ||
      documentContext.slice(0, 4000) ||
      ""
    const phase = json.phase

    if (phase !== "brainstorm" && phase !== "evaluate") {
      return NextResponse.json(
        { message: "phase must be brainstorm or evaluate" },
        { status: 400 }
      )
    }
    if (!seed && !documentContext && phase === "brainstorm") {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? "请先输入想法种子、粘贴文本，或上传文档"
              : "Provide an idea seed, pasted text, or upload a document"
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

    const gaps = asArray(json.gaps).map(g => String(g).trim()).filter(Boolean)
    const rqs = asArray(json.researchQuestions)
      .map(q => String(q).trim())
      .filter(Boolean)

    if (phase === "brainstorm") {
      const brainstormSeed = [seed, documentContext]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 16000)
      const prompt = buildBrainstormPrompt(
        brainstormSeed,
        gaps,
        rqs,
        json.literatureTopic,
        locale
      )
      let candidates = fallbackCandidates(brainstormSeed || seed, gaps, locale)
      try {
        const content = await generateJsonContent(request, json, prompt, locale)
        if (content?.trim()) {
          const parsed = JSON.parse(extractJson(content))
          const normalized = normalizeCandidates(parsed, locale)
          if (normalized.length >= 3) candidates = normalized
        }
      } catch (error: any) {
        // keep fallback; surface soft warning
        return NextResponse.json({
          phase,
          candidates,
          warning:
            locale === "zh"
              ? `模型发散失败，已使用启发式候选：${error?.message || "unknown"}`
              : `Model brainstorm failed; using heuristic candidates: ${error?.message || "unknown"}`
        })
      }
      return NextResponse.json({ phase, candidates })
    }

    // evaluate
    let candidate = json.candidate
    if (
      (!candidate?.title || !candidate?.oneLiner) &&
      (documentContext || seed)
    ) {
      // Allow evaluate with raw document / seed only
      const body = documentContext || seed
      const lines = body
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean)
      const title = (lines[0] || body.slice(0, 72)).replace(/^#{1,6}\s+/, "").slice(0, 96)
      candidate = {
        id: candidate?.id || "I1",
        title: title || "Imported idea",
        oneLiner:
          candidate?.oneLiner ||
          lines.slice(1, 4).join(" ").slice(0, 320) ||
          body.slice(0, 320),
        paperType: candidate?.paperType || "other",
        inspiration: candidate?.inspiration || "document import",
        notes: body.slice(0, 24000),
        source: candidate?.source || "document"
      }
    }
    if (!candidate?.title || !candidate?.oneLiner) {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? "请选择候选、粘贴想法文本，或上传文档后再评估"
              : "Select a candidate, paste idea text, or upload a document before evaluating"
        },
        { status: 400 }
      )
    }

    const prompt = buildEvaluatePrompt(
      seed || candidate.oneLiner,
      candidate,
      json.capability,
      gaps,
      locale,
      documentContext || candidate.notes
    )

    try {
      const content = await generateJsonContent(request, json, prompt, locale, {
        temperature: Math.max(json.chatSettings.temperature || 0.55, 0.5)
      })
      if (!content?.trim()) {
        return NextResponse.json({
          phase,
          card: fallbackEvaluation(
            candidate,
            locale,
            locale === "zh" ? "模型返回为空" : "Empty model response"
          )
        })
      }
      const parsed = JSON.parse(extractJson(content)) as Record<string, unknown>
      const card = normalizeIdeaCard(parsed, candidate, locale)
      const warning = scoresLookCollapsed(card.scores)
        ? locale === "zh"
          ? "模型五维分数过于雷同，已标记警告；建议换模型或重试评估"
          : "Model returned collapsed/template-like scores; warning attached — retry recommended"
        : undefined
      return NextResponse.json({ phase, card, warning })
    } catch (error: any) {
      return NextResponse.json({
        phase,
        card: fallbackEvaluation(
          candidate,
          locale,
          error?.message || "evaluate failed"
        ),
        warning:
          locale === "zh"
            ? `评估解析失败，已返回可编辑占位结果`
            : `Evaluation parse failed; returned editable placeholder`
      })
    }
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Idea request failed" },
      { status: 500 }
    )
  }
}
