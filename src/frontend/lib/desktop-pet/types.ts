/** Logical pet animation states used by MentorOS (subset of clawd + Q-pack). */
export type PetAction =
  | "idle"
  | "idleLook"
  | "thinking"
  | "working"
  | "building"
  | "juggling"
  | "error"
  | "happy"
  | "notification"
  | "yawning"
  | "sleeping"
  | "waking"
  | "drag"
  | "clickLeft"
  | "clickRight"
  | "annoyed"
  | "double"

/** Character ids aligned with Q-pack folders + Claude bridge. */
export type PetCharacterId =
  | "claude"
  | "gpt"
  | "gemini"
  | "grok"
  | "deepseek"
  | "qwen"
  | "copilot"

export type PetAssetFormat = "svg" | "gif" | "apng" | "webp" | "png"

export type PetAssetSource =
  | "local-qpack"
  | "clawd-bridged"
  | "pending"

export interface PetActionAsset {
  action: PetAction
  /** Public URL path once assets are present, e.g. /pets/claude/idle.svg */
  publicPath: string
  format: PetAssetFormat
  /** Upstream relative path inside clawd-on-desk (Claude only). */
  upstreamPath?: string
  /** Optional one-shot duration hint (ms); omit for looping. */
  durationMs?: number
  loop?: boolean
}

export interface PetCharacterPack {
  id: PetCharacterId
  displayName: string
  source: PetAssetSource
  /** LLM provider ids that should show this character. */
  providers: string[]
  /** Whether eye-tracking CSS vars are expected on idle SVG. */
  eyeTracking: boolean
  actions: Partial<Record<PetAction, PetActionAsset>>
  attributionId: string
}
