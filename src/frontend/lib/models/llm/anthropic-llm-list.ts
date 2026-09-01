import { LLM } from "@/types"

const LINK = "https://docs.anthropic.com/en/docs/about-claude/models"

function m(id: string, name: string): LLM {
  return {
    modelId: id,
    modelName: name,
    provider: "anthropic",
    hostedId: id,
    platformLink: LINK,
    imageInput: true
  }
}

/** Catalog refreshed Aug 2026 from Anthropic models overview. */
export const ANTHROPIC_LLM_LIST: LLM[] = [
  // Current generation
  m("claude-fable-5", "Claude Fable 5"),
  m("claude-opus-5", "Claude Opus 5"),
  m("claude-sonnet-5", "Claude Sonnet 5"),
  m("claude-haiku-4-5", "Claude Haiku 4.5"),
  m("claude-haiku-4-5-20251001", "Claude Haiku 4.5 (pinned)"),
  // Still available
  m("claude-opus-4-8", "Claude Opus 4.8"),
  m("claude-opus-4-7", "Claude Opus 4.7"),
  m("claude-opus-4-6", "Claude Opus 4.6"),
  m("claude-sonnet-4-6", "Claude Sonnet 4.6"),
  m("claude-sonnet-4-5", "Claude Sonnet 4.5"),
  m("claude-sonnet-4-5-20250929", "Claude Sonnet 4.5 (pinned)"),
  m("claude-opus-4-5", "Claude Opus 4.5"),
  m("claude-opus-4-5-20251101", "Claude Opus 4.5 (pinned)"),
  m("claude-sonnet-4-20250514", "Claude Sonnet 4"),
  m("claude-opus-4-20250514", "Claude Opus 4"),
  // Older but commonly proxied
  m("claude-3-7-sonnet-20250219", "Claude 3.7 Sonnet"),
  m("claude-3-5-sonnet-20241022", "Claude 3.5 Sonnet"),
  m("claude-3-5-haiku-20241022", "Claude 3.5 Haiku"),
  m("claude-3-haiku-20240307", "Claude 3 Haiku")
]

export function buildAnthropicProxyModel(modelId: string): LLM {
  const short = modelId.split("/").pop() || modelId
  return {
    modelId,
    modelName: `${short} (configured)`,
    provider: "anthropic",
    hostedId: modelId,
    platformLink: LINK,
    imageInput: true
  }
}
