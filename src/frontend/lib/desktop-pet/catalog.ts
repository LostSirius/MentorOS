import type { PetAction, PetActionAsset, PetCharacterId, PetCharacterPack } from "./types"

const QPACK_ACTIONS: PetAction[] = [
  "idle",
  "idleLook",
  "thinking",
  "working",
  "building",
  "juggling",
  "error",
  "happy",
  "notification"
]

/** Shippable desktop-pet characters (Copilot cancelled upstream). */
export const READY_PET_CHARACTER_IDS: PetCharacterId[] = [
  "gpt",
  "gemini",
  "grok",
  "deepseek",
  "qwen",
  "claude"
]

function qpackActions(
  character: "gpt" | "gemini" | "grok" | "deepseek" | "qwen" | "claude"
): Partial<Record<PetAction, PetActionAsset>> {
  const out: Partial<Record<PetAction, PetActionAsset>> = {}
  for (const action of QPACK_ACTIONS) {
    out[action] = {
      action,
      publicPath: `/pets/qpack/${character}/${action}.svg`,
      format: "svg",
      loop: !["error", "happy", "notification", "idleLook"].includes(action)
    }
  }
  return out
}

export const PET_CHARACTERS: Record<PetCharacterId, PetCharacterPack> = {
  claude: {
    id: "claude",
    displayName: "Claude",
    source: "local-qpack",
    providers: ["anthropic", "claude"],
    eyeTracking: true,
    actions: qpackActions("claude"),
    attributionId: "mascot-pack"
  },
  gpt: {
    id: "gpt",
    displayName: "GPT",
    source: "local-qpack",
    providers: ["openai", "azure"],
    eyeTracking: true,
    actions: qpackActions("gpt"),
    attributionId: "mascot-pack"
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini",
    source: "local-qpack",
    providers: ["google", "gemini"],
    eyeTracking: true,
    actions: qpackActions("gemini"),
    attributionId: "mascot-pack"
  },
  grok: {
    id: "grok",
    displayName: "Grok",
    source: "local-qpack",
    providers: ["grok", "xai"],
    eyeTracking: true,
    actions: qpackActions("grok"),
    attributionId: "mascot-pack"
  },
  deepseek: {
    id: "deepseek",
    displayName: "DeepSeek",
    source: "local-qpack",
    providers: ["deepseek"],
    eyeTracking: true,
    actions: qpackActions("deepseek"),
    attributionId: "mascot-pack"
  },
  qwen: {
    id: "qwen",
    displayName: "Qwen",
    source: "local-qpack",
    providers: ["qwen", "alibaba"],
    eyeTracking: true,
    actions: qpackActions("qwen"),
    attributionId: "mascot-pack"
  },
  copilot: {
    id: "copilot",
    displayName: "Copilot",
    source: "pending",
    providers: ["copilot", "github"],
    eyeTracking: true,
    actions: {},
    attributionId: "mascot-pack"
  }
}

export const DEFAULT_PET_CHARACTER: PetCharacterId = "gpt"

/** Map chat / model provider or model id → pet character. */
export function resolvePetCharacter(
  providerOrModel?: string | null
): PetCharacterId {
  if (!providerOrModel) return DEFAULT_PET_CHARACTER
  const key = providerOrModel.toLowerCase()

  // Prefer model-name cues over gateway providers (groq / openrouter / azure).
  if (key.includes("claude") || key.includes("anthropic")) return "claude"
  if (key.includes("qwen") || key.includes("alibaba")) return "qwen"
  if (key.includes("deepseek")) return "deepseek"
  if (key.includes("gemini") || key.includes("google")) return "gemini"
  if (key.includes("grok") || key.includes("xai")) return "grok"
  if (/\bgpt\b/.test(key) || key.includes("openai") || key.includes("chatgpt"))
    return "gpt"

  for (const pack of Object.values(PET_CHARACTERS)) {
    if (pack.providers.some(p => key === p || key.includes(p))) {
      if (pack.source === "pending") return DEFAULT_PET_CHARACTER
      return pack.id
    }
  }

  // Copilot assets cancelled upstream → default
  return DEFAULT_PET_CHARACTER
}
