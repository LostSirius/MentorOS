import { ChatSettings, LLM, LLMID, OpenRouterLLM } from "@/types"
import { buildSystemPrompt, CopilotMode } from "./copilot-prompts"
import { LLM_LIST } from "./models/llm/llm-list"
import { Tables } from "@/supabase/types"
import {
  composeSkillWithFormat,
  resolveSkillPromptForMode
} from "./skill-resolver"

export interface EvaluatorResult {
  scores: {
    feasibility: number
    novelty: number
    impact: number
    significance: number
    clarity: number
  }
  suggestions: {
    feasibility: string
    novelty: string
    impact: string
    significance: string
    clarity: string
  }
}

export interface DraftingResult {
  paragraphs: string[]
  critiques: {
    id: string
    paragraphIndex: number
    text: string
    type: "suggestion" | "issue" | "praise"
  }[]
}

export interface GraphResult {
  nodes: {
    id: string
    label: string
    type: "concept" | "method" | "finding" | "literature"
  }[]
  edges: { source: string; target: string }[]
}

export function resolveModelProvider(
  modelId: LLMID | string,
  models: Tables<"models">[],
  availableHostedModels: LLM[],
  availableLocalModels: LLM[],
  availableOpenRouterModels: OpenRouterLLM[]
): { provider: string; customModelId?: string } {
  const allModels: LLM[] = [
    ...models.map(model => ({
      modelId: model.model_id as LLMID,
      modelName: model.name,
      provider: "custom" as const,
      hostedId: model.id,
      platformLink: "",
      imageInput: false
    })),
    ...LLM_LIST,
    ...availableLocalModels,
    ...availableOpenRouterModels
  ]

  const match = allModels.find(m => m.modelId === modelId)
  if (!match) return { provider: "openai" }

  if (match.provider === "custom" && match.hostedId) {
    return { provider: "custom", customModelId: match.hostedId }
  }

  return { provider: match.provider }
}

function extractJson(text: string): string {
  const match = text.match(/\{[\s\S]*\}/)
  return match ? match[0] : text
}

export async function generateCopilotContent(
  idea: string,
  mode: CopilotMode,
  chatSettings: ChatSettings,
  provider: string,
  customModelId?: string,
  apiKey?: string
): Promise<string> {
  const formatPrompt = buildSystemPrompt(mode)
  const skillPrompt = await resolveSkillPromptForMode(mode, apiKey)
  const systemPrompt = composeSkillWithFormat(skillPrompt, formatPrompt)
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: idea }
  ]

  const response = await fetch("/api/copilot/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatSettings,
      messages,
      provider,
      customModelId
    })
  })

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    try {
      const error = await response.json()
      errorMessage = error.message || errorMessage
    } catch {
      try {
        errorMessage = await response.text()
      } catch {}
    }
    throw new Error(errorMessage)
  }

  const { content } = (await response.json()) as { content: string }
  return content
}

export async function generateEvaluator(
  idea: string,
  chatSettings: ChatSettings,
  provider: string,
  customModelId?: string,
  apiKey?: string
): Promise<EvaluatorResult> {
  const raw = await generateCopilotContent(
    idea,
    "evaluator",
    chatSettings,
    provider,
    customModelId,
    apiKey
  )

  try {
    const jsonText = extractJson(raw)
    const parsed = JSON.parse(jsonText) as EvaluatorResult
    return {
      scores: {
        feasibility: Math.min(10, Math.max(0, parsed.scores?.feasibility ?? 5)),
        novelty: Math.min(10, Math.max(0, parsed.scores?.novelty ?? 5)),
        impact: Math.min(10, Math.max(0, parsed.scores?.impact ?? 5)),
        significance: Math.min(10, Math.max(0, parsed.scores?.significance ?? 5)),
        clarity: Math.min(10, Math.max(0, parsed.scores?.clarity ?? 5))
      },
      suggestions: {
        feasibility: parsed.suggestions?.feasibility || "",
        novelty: parsed.suggestions?.novelty || "",
        impact: parsed.suggestions?.impact || "",
        significance: parsed.suggestions?.significance || "",
        clarity: parsed.suggestions?.clarity || ""
      }
    }
  } catch {
    return {
      scores: { feasibility: 5, novelty: 5, impact: 5, significance: 5, clarity: 5 },
      suggestions: {
        feasibility: "",
        novelty: "",
        impact: "",
        significance: "",
        clarity: ""
      }
    }
  }
}

export async function generateDraft(
  idea: string,
  chatSettings: ChatSettings,
  provider: string,
  customModelId?: string,
  apiKey?: string
): Promise<DraftingResult> {
  const raw = await generateCopilotContent(
    idea,
    "drafting",
    chatSettings,
    provider,
    customModelId,
    apiKey
  )

  try {
    const jsonText = extractJson(raw)
    const parsed = JSON.parse(jsonText) as DraftingResult
    return {
      paragraphs: parsed.paragraphs || [],
      critiques: (parsed.critiques || []).map((c, i) => ({
        id: c.id || `c${i}`,
        paragraphIndex: c.paragraphIndex ?? 0,
        text: c.text || "",
        type: ["suggestion", "issue", "praise"].includes(c.type)
          ? (c.type as "suggestion" | "issue" | "praise")
          : "suggestion"
      }))
    }
  } catch {
    return { paragraphs: [], critiques: [] }
  }
}

export async function generateGraph(
  idea: string,
  chatSettings: ChatSettings,
  provider: string,
  customModelId?: string,
  apiKey?: string
): Promise<GraphResult> {
  const raw = await generateCopilotContent(
    idea,
    "knowledge-graph",
    chatSettings,
    provider,
    customModelId,
    apiKey
  )

  try {
    const jsonText = extractJson(raw)
    const parsed = JSON.parse(jsonText) as GraphResult
    const nodes = (parsed.nodes || []).map(n => ({
      id: n.id,
      label: n.label,
      type: ["concept", "method", "finding", "literature"].includes(n.type)
        ? (n.type as "concept" | "method" | "finding" | "literature")
        : "concept"
    }))
    const edges = parsed.edges || []
    if (nodes.length === 0) {
      throw new Error("Empty graph from model")
    }
    return { nodes, edges }
  } catch {
    throw new Error("Could not parse knowledge graph from model response")
  }
}
