import type { CopilotMode } from "./copilot-prompts"
import {
  inferSkillIdFromText,
  skillIdForCanvasMode,
  STAGE_SUPPORT_SKILLS
} from "./research-workflow"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_SUPERVISOR_SKILLS_BACKEND_URL ||
  "http://localhost:6000"

/** Canvas / flow mode → skill directory id (silent mapping, never shown in UI) */
export const MODE_TO_SKILL: Record<string, string> = {
  evaluator: "idea-evaluator",
  drafting: "intro-drafter",
  "literature-review": "literature-review",
  brainstorm: "brainstorm",
  "knowledge-graph": ""
}

export function getBackendUrl() {
  return (
    (typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_SUPERVISOR_SKILLS_BACKEND_URL) ||
    BACKEND_URL
  )
}

/**
 * Silently load a skill system prompt by id from the Supervisor backend.
 * Returns "" if backend is offline or skill missing — callers should fall back.
 */
export async function fetchSkillSystemPrompt(
  skillId: string,
  apiKey?: string
): Promise<string> {
  if (!skillId) return ""
  try {
    const headers: Record<string, string> = {}
    if (apiKey) headers["X-API-Key"] = apiKey
    const res = await fetch(`${getBackendUrl()}/v1/skills/${skillId}`, {
      headers,
      cache: "no-store"
    })
    if (!res.ok) return ""
    const data = await res.json()
    return (data.system_prompt as string) || ""
  } catch {
    return ""
  }
}

async function composeModePrompt(
  mode: string,
  apiKey?: string
): Promise<string> {
  const primary = skillIdForCanvasMode(mode) || MODE_TO_SKILL[mode] || ""
  if (!primary) return ""

  const support = STAGE_SUPPORT_SKILLS[mode] || []
  const ids = [primary, ...support.filter(id => id !== primary)]
  const prompts = await Promise.all(
    ids.map(id => fetchSkillSystemPrompt(id, apiKey))
  )
  const parts = prompts.filter(Boolean)
  if (!parts.length) return ""
  if (parts.length === 1) return parts[0]
  return (
    parts[0] +
    "\n\n--- SUPPLEMENTARY RESEARCH GUIDANCE ---\n\n" +
    parts.slice(1).join("\n\n---\n\n") +
    "\n\n--- END SUPPLEMENTARY ---\n\n" +
    "Never name internal procedure identifiers in your reply."
  )
}

/** Resolve skill prompt for a canvas generation mode. */
export async function resolveSkillPromptForMode(
  mode: CopilotMode | "literature-review" | "brainstorm",
  apiKey?: string
): Promise<string> {
  return composeModePrompt(mode, apiKey)
}

/**
 * Detect skill from conversation and return system prompt + optional canvas mode.
 * Used by chat send path — no UI side effects here.
 */
export async function detectAndResolveSkill(
  messages: { role: string; content: string }[],
  apiKey?: string
): Promise<{
  systemPrompt: string
  canvasMode: string | null
  skillId: string | null
}> {
  // Local intent hint (works even if backend detect misses newer skills)
  const lastUser = [...messages].reverse().find(m => m.role === "user")
  const localHint = inferSkillIdFromText(lastUser?.content || "")

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    }
    if (apiKey) headers["X-API-Key"] = apiKey

    const res = await fetch(`${getBackendUrl()}/v1/agent/detect`, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages }),
      cache: "no-store"
    })
    if (!res.ok) {
      if (localHint) {
        const systemPrompt = await fetchSkillSystemPrompt(localHint, apiKey)
        return {
          systemPrompt,
          canvasMode: null,
          skillId: localHint
        }
      }
      return { systemPrompt: "", canvasMode: null, skillId: null }
    }
    const data = await res.json()
    const detectedId = data.detected ? data.skill?.id || null : null
    const skillId = detectedId || localHint
    if (!skillId) {
      return { systemPrompt: "", canvasMode: null, skillId: null }
    }
    const systemPrompt =
      (data.system_prompt as string) ||
      (await fetchSkillSystemPrompt(skillId, apiKey))
    return {
      systemPrompt,
      canvasMode: data.skill?.canvas_mode || null,
      skillId
    }
  } catch {
    if (localHint) {
      const systemPrompt = await fetchSkillSystemPrompt(localHint, apiKey)
      return { systemPrompt, canvasMode: null, skillId: localHint }
    }
    return { systemPrompt: "", canvasMode: null, skillId: null }
  }
}

/** Compose skill procedure with a hard output-format constraint for Canvas JSON tools. */
export function composeSkillWithFormat(
  skillPrompt: string,
  formatPrompt: string
): string {
  if (!skillPrompt) return formatPrompt
  return `${skillPrompt}

---
OUTPUT CONTRACT (must follow exactly — overrides conflicting format notes above):
${formatPrompt}`
}
