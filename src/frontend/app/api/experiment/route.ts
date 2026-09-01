import { ChatSettings } from "@/types"
import type { IdeaCard } from "@/lib/idea-types"
import {
  buildExperimentGates,
  emptyExperiment,
  hasAttachedResults,
  type Baseline,
  type ExperimentRecord,
  type ExperimentInterpretation
} from "@/lib/experiment-types"
import {
  experimentLanguageInstruction,
  experimentModelHttpError,
  resolveExperimentLocale,
  type ExperimentLocale
} from "@/lib/server/experiment-locale"
import { loadInjectableFragment } from "@/lib/server/load-injectable"
import { loadSkillForMode } from "@/lib/server/load-skill"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

type ExperimentPhase = "draft" | "interpret"

interface ExperimentRequest {
  phase: ExperimentPhase
  ideaCard?: IdeaCard | null
  ideaText?: string
  literatureHints?: {
    topic?: string
    datasets?: string[]
    gaps?: string[]
  }
  capability?: {
    hoursPerWeek?: number
    compute?: string
    deadlineWeeks?: number
  }
  record?: ExperimentRecord
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

function normalizeStringList(raw: unknown, max = 16): string[] {
  return asArray(raw as unknown[])
    .map(item => {
      if (typeof item === "string") return item.trim()
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>
        return String(
          obj.name || obj.metric || obj.label || obj.id || ""
        ).trim()
      }
      return String(item ?? "").trim()
    })
    .filter(Boolean)
    .slice(0, max)
}

/** Prefer model list; if empty/missing, keep previous/fallback values. */
function coalesceStringList(
  raw: unknown,
  fallback: string[] | undefined,
  max = 16
): string[] {
  const list = normalizeStringList(raw, max)
  return list.length > 0 ? list : normalizeStringList(fallback, max)
}

function normalizeBaselines(raw: unknown): Baseline[] {
  return asArray(raw as Baseline[])
    .map(b => ({
      name: String(b?.name || "").trim(),
      why: String(b?.why || "").trim(),
      evidenceLevel: (["L0", "L1", "L2", "L3"].includes(String(b?.evidenceLevel))
        ? (b.evidenceLevel as Baseline["evidenceLevel"])
        : "L2") as Baseline["evidenceLevel"]
    }))
    .filter(b => b.name)
    .slice(0, 12)
}

function coalesceBaselines(
  raw: unknown,
  fallback: Baseline[] | undefined
): Baseline[] {
  const list = normalizeBaselines(raw)
  return list.length > 0 ? list : normalizeBaselines(fallback)
}

function normalizeRecord(
  parsed: Record<string, unknown>,
  locale: ExperimentLocale,
  ideaCard?: IdeaCard | null,
  prev?: ExperimentRecord
): ExperimentRecord {
  const base = emptyExperiment(locale)
  // Accept common alternate keys from models
  const metricsRaw =
    parsed.metrics ?? parsed.primaryMetrics ?? parsed.primary_metrics
  const datasetsRaw = parsed.datasets ?? parsed.data ?? parsed.dataset
  const record: ExperimentRecord = {
    ...base,
    ...prev,
    version: 1,
    ideaId: ideaCard?.candidateId || ideaCard?.id || prev?.ideaId,
    ideaTitle: ideaCard?.title || prev?.ideaTitle,
    status: prev?.status === "recipe_locked" ? "recipe_locked" : "draft",
    hypotheses: coalesceStringList(
      parsed.hypotheses,
      prev?.hypotheses,
      8
    ),
    baselines: coalesceBaselines(parsed.baselines, prev?.baselines),
    datasets: coalesceStringList(datasetsRaw, prev?.datasets, 12),
    metrics: coalesceStringList(metricsRaw, prev?.metrics, 12),
    ablations: coalesceStringList(parsed.ablations, prev?.ablations, 12),
    robustnessChecks: coalesceStringList(
      parsed.robustnessChecks ?? parsed.robustness,
      prev?.robustnessChecks,
      12
    ),
    failureCriteria: String(
      parsed.failureCriteria ?? prev?.failureCriteria ?? ""
    ).trim(),
    expectedArtifacts: coalesceStringList(
      parsed.expectedArtifacts ?? parsed.artifacts,
      prev?.expectedArtifacts,
      16
    ),
    computePlan: String(parsed.computePlan ?? prev?.computePlan ?? "").trim(),
    checklist: coalesceStringList(parsed.checklist, prev?.checklist, 20),
    runLogs: prev?.runLogs || [],
    resultTables: prev?.resultTables || [],
    interpretation: prev?.interpretation,
    locale,
    createdAt: prev?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    gates: []
  }
  record.gates = buildExperimentGates(record)
  return record
}

function fallbackDraft(
  locale: ExperimentLocale,
  ideaCard?: IdeaCard | null,
  ideaText?: string
): ExperimentRecord {
  const title = ideaCard?.title || ideaText?.slice(0, 72) || "Untitled idea"
  const hyps =
    ideaCard?.hypotheses?.length
      ? ideaCard.hypotheses
      : [
          locale === "zh"
            ? `H1：相对强基线，所提方法在主指标上出现可复现的显著提升（关于「${title}」）。`
            : `H1: Relative to a strong baseline, the proposed approach yields a reproducible significant gain on the primary metric for “${title}”.`
        ]
  const rqs = ideaCard?.researchQuestions?.map(q => q.text) || []
  const record: ExperimentRecord = {
    version: 1,
    ideaId: ideaCard?.candidateId || ideaCard?.id,
    ideaTitle: title,
    status: "draft",
    hypotheses: hyps,
    baselines: [
      {
        name: locale === "zh" ? "强基线 / SOTA 候选" : "Strong baseline / SOTA candidate",
        why:
          locale === "zh"
            ? "须替换为当年可比 SOTA，并标注证据层级（避免假基线）。"
            : "Replace with a current comparable SOTA and mark evidence level (avoid weak baselines).",
        evidenceLevel: "L2"
      },
      {
        name: locale === "zh" ? "朴素/消融对照" : "Naive / ablated control",
        why:
          locale === "zh"
            ? "用于分离所提组件的贡献。"
            : "Isolates the contribution of the proposed component.",
        evidenceLevel: "L1"
      }
    ],
    datasets:
      locale === "zh"
        ? ["待确认公开数据集（来自文献线索，需人工确认）"]
        : ["Public dataset candidate (from literature hints; confirm manually)"],
    metrics:
      locale === "zh"
        ? ["主指标（待定）", "辅助指标：延迟 / 参数量 / 稳健性"]
        : ["Primary metric (TBD)", "Auxiliary: latency / params / robustness"],
    ablations:
      locale === "zh"
        ? ["去掉核心模块", "替换关键设计"]
        : ["Remove core module", "Replace key design choice"],
    robustnessChecks:
      locale === "zh"
        ? ["多种子", "分布外拆分", "超参扰动"]
        : ["Multi-seed", "OOD split", "Hyperparameter perturbation"],
    failureCriteria:
      locale === "zh"
        ? "若相对强基线主指标无显著提升，或稳健性检查失败，则判定假设不成立并记录失败模式。"
        : "If the primary metric shows no significant gain vs the strong baseline, or robustness checks fail, reject the hypothesis and log failure modes.",
    expectedArtifacts: [
      "out_dir/config.yaml",
      "out_dir/metrics.json",
      "out_dir/predictions.jsonl",
      "out_dir/run.log",
      "out_dir/figures/"
    ],
    computePlan:
      locale === "zh"
        ? "粗算：单卡训练/评测预算与预计墙钟时间（待按资源填写）。"
        : "Rough compute: single-GPU train/eval budget and wall-clock estimate (fill per resources).",
    checklist:
      locale === "zh"
        ? [
            "确认强基线不是过时方法",
            "主指标与 RQ 对齐",
            "失败判据可操作",
            "产物清单可复现",
            ...rqs.slice(0, 2).map(q => `对齐 RQ：${q.slice(0, 80)}`)
          ]
        : [
            "Confirm strong baseline is not obsolete",
            "Primary metric aligned with RQ",
            "Failure criteria are actionable",
            "Artifact list is reproducible",
            ...rqs.slice(0, 2).map(q => `Align RQ: ${q.slice(0, 80)}`)
          ],
    locale,
    gates: [],
    createdAt: new Date().toISOString()
  }
  record.gates = buildExperimentGates(record)
  return record
}

function normalizeInterpretation(
  parsed: Record<string, unknown>,
  record: ExperimentRecord,
  locale: ExperimentLocale
): ExperimentInterpretation {
  const outcomes = asArray(
    (parsed.hypothesisOutcomes || parsed.outcomes) as any[]
  )
    .map(o => ({
      hypothesis: String(o?.hypothesis || "").trim(),
      outcome: (["support", "reject", "inconclusive"].includes(
        String(o?.outcome)
      )
        ? o.outcome
        : "inconclusive") as "support" | "reject" | "inconclusive",
      note: String(o?.note || "").trim()
    }))
    .filter(o => o.hypothesis)
    .slice(0, 12)

  const claimChecks = asArray((parsed.claimChecks || []) as any[])
    .map(c => ({
      claim: String(c?.claim || "").trim(),
      verdict: ([
        "ALIGNED",
        "OVERSTATED",
        "NOT_SUPPORTED",
        "PROVENANCE_INSUFFICIENT"
      ].includes(String(c?.verdict))
        ? c.verdict
        : "PROVENANCE_INSUFFICIENT") as ClaimCheck["verdict"]
    }))
    .filter(c => c.claim)
    .slice(0, 12)

  // If model invented outcomes without results, strip numeric-looking claims
  if (!hasAttachedResults(record)) {
    return {
      hypothesisOutcomes: record.hypotheses.map(h => ({
        hypothesis: h,
        outcome: "inconclusive" as const,
        note:
          locale === "zh"
            ? "尚未附上结果，无法判定。"
            : "No results attached; cannot judge."
      })),
      claimChecks: [
        {
          claim:
            locale === "zh"
              ? "任何数值结果声称"
              : "Any numeric result claim",
          verdict: "PROVENANCE_INSUFFICIENT"
        }
      ],
      risks: asArray(parsed.risks as string[]).map(String).slice(0, 8),
      summary:
        locale === "zh"
          ? "无真实结果附件，解读已降级为空结果门禁。"
          : "No real results attached; interpretation downgraded by honesty gate."
    }
  }

  return {
    hypothesisOutcomes:
      outcomes.length > 0
        ? outcomes
        : record.hypotheses.map(h => ({
            hypothesis: h,
            outcome: "inconclusive" as const,
            note:
              locale === "zh"
                ? "模型未给出明确判定。"
                : "Model did not provide a clear judgment."
          })),
    claimChecks,
    risks: normalizeStringList(parsed.risks, 10),
    summary: String(parsed.summary || "").trim() || undefined
  }
}

// Fix ClaimCheck type reference - import it
type ClaimCheck = NonNullable<
  ExperimentInterpretation["claimChecks"]
>[number]

function buildDraftPrompt(
  locale: ExperimentLocale,
  ideaCard: IdeaCard | null | undefined,
  ideaText: string,
  literatureHints: ExperimentRequest["literatureHints"],
  capability: ExperimentRequest["capability"]
): string {
  const injectable = loadInjectableFragment("experiment")
  const skill = loadSkillForMode("benchmark")
  return `${injectable}

${skill ? `--- SKILL ---\n${skill}\n--- END SKILL ---\n` : ""}

PHASE: Draft an executable experiment recipe. Do NOT invent numeric results.

${experimentLanguageInstruction(locale)}
UI locale: ${locale}

IDEA CARD (JSON, may be partial):
${JSON.stringify(ideaCard || null, null, 2)}

IDEA TEXT / NOTES:
${ideaText || "(none)"}

LITERATURE HINTS (candidate only — mark as needing confirmation):
${JSON.stringify(literatureHints || {}, null, 2)}

CAPABILITY:
${JSON.stringify(capability || {}, null, 2)}

Required fields:
- hypotheses[] (falsifiable)
- baselines[] with {name, why, evidenceLevel L0-L3}; include a strong/SOTA candidate
- datasets[], metrics[] (primary + aux), ablations[], robustnessChecks[]
- failureCriteria, expectedArtifacts[] (out_dir style), computePlan, checklist[]

Warn about weak baselines, unverifiable claims, bug-as-insight / shortcut risks in checklist.

Return ONLY valid JSON:
{
  "hypotheses": ["H1: ..."],
  "baselines": [{"name": "...", "why": "...", "evidenceLevel": "L2"}],
  "datasets": ["..."],
  "metrics": ["primary...", "aux..."],
  "ablations": ["..."],
  "robustnessChecks": ["..."],
  "failureCriteria": "...",
  "expectedArtifacts": ["out_dir/..."],
  "computePlan": "...",
  "checklist": ["..."]
}`
}

function buildInterpretPrompt(
  locale: ExperimentLocale,
  record: ExperimentRecord
): string {
  const injectable = loadInjectableFragment("experiment")
  const skill = loadSkillForMode("benchmark")
  return `${injectable}

${skill ? `--- SKILL ---\n${skill}\n--- END SKILL ---\n` : ""}

PHASE: Interpret attached results honestly. Never invent numbers beyond the provided logs/tables.

${experimentLanguageInstruction(locale)}
UI locale: ${locale}

RECIPE:
${JSON.stringify(
  {
    hypotheses: record.hypotheses,
    baselines: record.baselines,
    datasets: record.datasets,
    metrics: record.metrics,
    failureCriteria: record.failureCriteria
  },
  null,
  2
)}

RUN LOGS:
${(record.runLogs || []).join("\n\n") || "(none)"}

RESULT TABLES:
${(record.resultTables || []).join("\n\n") || "(none)"}

For each hypothesis: support | reject | inconclusive with a short note grounded in the attached evidence.
Claim checks: ALIGNED | OVERSTATED | NOT_SUPPORTED | PROVENANCE_INSUFFICIENT.
List risks (weak baseline, shortcut, frame-lock, hallucinated metrics) if relevant.

Return ONLY valid JSON:
{
  "summary": "...",
  "hypothesisOutcomes": [
    { "hypothesis": "...", "outcome": "support|reject|inconclusive", "note": "..." }
  ],
  "claimChecks": [
    { "claim": "...", "verdict": "ALIGNED|OVERSTATED|NOT_SUPPORTED|PROVENANCE_INSUFFICIENT" }
  ],
  "risks": ["..."]
}`
}

async function generateJsonContent(
  request: NextRequest,
  json: ExperimentRequest,
  prompt: string,
  locale: ExperimentLocale
): Promise<string> {
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
          temperature: Math.min(json.chatSettings.temperature || 0.3, 0.5)
        },
        messages: [
          {
            role: "system",
            content:
              "You are a strict JSON generator for experiment recipes. Output one valid JSON object only."
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
        chatSettings: json.chatSettings,
        provider: json.provider,
        customModelId: json.customModelId,
        messages: [
          {
            role: "system",
            content:
              "You generate strictly valid JSON for MentorOS Experiment Design & Evaluation."
          },
          { role: "user", content: prompt }
        ]
      }),
      signal: AbortSignal.timeout(120000)
    }
  )

  if (!generateResponse.ok) {
    throw new Error(experimentModelHttpError(locale, generateResponse.status))
  }

  const { content } = (await generateResponse.json()) as { content: string }
  return content
}

export async function POST(request: NextRequest) {
  try {
    const json = (await request.json()) as ExperimentRequest
    const locale = resolveExperimentLocale(json.locale)
    const phase = json.phase

    if (phase !== "draft" && phase !== "interpret") {
      return NextResponse.json(
        { message: "phase must be draft or interpret" },
        { status: 400 }
      )
    }
    if (!json.chatSettings || !json.provider) {
      return NextResponse.json(
        { message: "chatSettings and provider are required" },
        { status: 400 }
      )
    }

    if (phase === "draft") {
      const ideaText = String(json.ideaText || "").trim()
      if (!json.ideaCard && !ideaText) {
        return NextResponse.json(
          {
            message:
              locale === "zh"
                ? "请先从 Idea 导入或粘贴想法描述"
                : "Import an IdeaCard or paste an idea description first"
          },
          { status: 400 }
        )
      }

      const prompt = buildDraftPrompt(
        locale,
        json.ideaCard,
        ideaText,
        json.literatureHints,
        json.capability
      )
      let record = fallbackDraft(locale, json.ideaCard, ideaText)
      try {
        const content = await generateJsonContent(request, json, prompt, locale)
        if (content?.trim()) {
          const parsed = JSON.parse(extractJson(content)) as Record<
            string,
            unknown
          >
          record = normalizeRecord(parsed, locale, json.ideaCard, {
            ...record,
            status: "draft"
          })
        }
      } catch (error: any) {
        return NextResponse.json({
          phase,
          record,
          warning:
            locale === "zh"
              ? `配方生成失败，已返回可编辑草稿：${error?.message || "unknown"}`
              : `Recipe generation failed; editable draft returned: ${error?.message || "unknown"}`
        })
      }
      return NextResponse.json({ phase, record })
    }

    // interpret
    const record = json.record
    if (!record) {
      return NextResponse.json(
        {
          message:
            locale === "zh" ? "缺少实验配方" : "Missing experiment record"
        },
        { status: 400 }
      )
    }
    if (
      record.status !== "recipe_locked" &&
      record.status !== "results_attached" &&
      record.status !== "interpreted"
    ) {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? "请先锁定配方再解读结果"
              : "Lock the recipe before interpreting results"
        },
        { status: 400 }
      )
    }
    if (!hasAttachedResults(record)) {
      const blocked: ExperimentRecord = {
        ...record,
        status: "recipe_locked",
        interpretation: undefined,
        gates: buildExperimentGates({
          ...record,
          interpretation: {
            hypothesisOutcomes: [],
            claimChecks: []
          }
        }),
        updatedAt: new Date().toISOString()
      }
      // Force G5 gate
      blocked.gates = buildExperimentGates({
        ...blocked,
        status: "interpreted",
        interpretation: {
          hypothesisOutcomes: [],
          claimChecks: []
        }
      })
      return NextResponse.json({
        phase,
        record: blocked,
        warning:
          locale === "zh"
            ? "请先粘贴 runLog 或结果表（G5：无结果禁止数值叙事）"
            : "Attach runLog or result tables first (G5: no numeric narrative without results)"
      })
    }

    const prompt = buildInterpretPrompt(locale, record)
    try {
      const content = await generateJsonContent(request, json, prompt, locale)
      const parsed = content?.trim()
        ? (JSON.parse(extractJson(content)) as Record<string, unknown>)
        : {}
      const interpretation = normalizeInterpretation(parsed, record, locale)
      const next: ExperimentRecord = {
        ...record,
        status: "interpreted",
        interpretation,
        locale,
        updatedAt: new Date().toISOString(),
        gates: []
      }
      next.gates = buildExperimentGates(next)
      return NextResponse.json({ phase, record: next })
    } catch (error: any) {
      const interpretation = normalizeInterpretation({}, record, locale)
      const next: ExperimentRecord = {
        ...record,
        status: "interpreted",
        interpretation,
        updatedAt: new Date().toISOString(),
        gates: []
      }
      next.gates = buildExperimentGates(next)
      return NextResponse.json({
        phase,
        record: next,
        warning:
          locale === "zh"
            ? `解读失败，已返回占位结果：${error?.message || "unknown"}`
            : `Interpretation failed; placeholder returned: ${error?.message || "unknown"}`
      })
    }
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Experiment request failed" },
      { status: 500 }
    )
  }
}
