import type { PetCharacterId } from "./types"

/** Per-character chrome matching Q-pack visual language. */
export type PetTheme = {
  id: PetCharacterId
  label: string
  tagline: string
  /** CSS variables for dossier / bars */
  accent: string
  accentSoft: string
  accentGlow: string
  panelBg: string
  panelBorder: string
  text: string
  muted: string
  barTrack: string
  barFill: string
  chipBg: string
  /** Short motif for UI copy */
  motif: string
}

export const PET_THEMES: Record<PetCharacterId, PetTheme> = {
  gpt: {
    id: "gpt",
    label: "GPT",
    tagline: "结绳学伴 · 机械呼吸",
    accent: "#22c55e",
    accentSoft: "rgba(34,197,94,0.18)",
    accentGlow: "rgba(34,197,94,0.35)",
    panelBg: "linear-gradient(160deg,#1a1d24 0%,#12141a 55%,#0c0e12 100%)",
    panelBorder: "rgba(34,197,94,0.35)",
    text: "#e8f5ee",
    muted: "#8fa398",
    barTrack: "rgba(255,255,255,0.08)",
    barFill: "linear-gradient(90deg,#16a34a,#4ade80)",
    chipBg: "rgba(34,197,94,0.15)",
    motif: "knot"
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    tagline: "星棱学伴 · 流转光泽",
    accent: "#a78bfa",
    accentSoft: "rgba(167,139,250,0.2)",
    accentGlow: "rgba(236,72,153,0.28)",
    panelBg:
      "linear-gradient(160deg,#1e1530 0%,#15122a 45%,#0f1428 100%)",
    panelBorder: "rgba(167,139,250,0.4)",
    text: "#f3e8ff",
    muted: "#b4a3d4",
    barTrack: "rgba(255,255,255,0.08)",
    barFill: "linear-gradient(90deg,#818cf8,#e879f9)",
    chipBg: "rgba(167,139,250,0.18)",
    motif: "star"
  },
  grok: {
    id: "grok",
    label: "Grok",
    tagline: "航员学伴 · 低重力",
    accent: "#f8fafc",
    accentSoft: "rgba(248,250,252,0.12)",
    accentGlow: "rgba(148,163,184,0.35)",
    panelBg: "linear-gradient(160deg,#0a0a0c 0%,#141418 50%,#1c1c22 100%)",
    panelBorder: "rgba(248,250,252,0.28)",
    text: "#f8fafc",
    muted: "#94a3b8",
    barTrack: "rgba(255,255,255,0.1)",
    barFill: "linear-gradient(90deg,#64748b,#e2e8f0)",
    chipBg: "rgba(255,255,255,0.1)",
    motif: "bolt"
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    tagline: "鲸探学伴 · 深海扫描",
    accent: "#38bdf8",
    accentSoft: "rgba(56,189,248,0.18)",
    accentGlow: "rgba(14,165,233,0.35)",
    panelBg: "linear-gradient(160deg,#0b1c2c 0%,#0a1622 55%,#071018 100%)",
    panelBorder: "rgba(56,189,248,0.38)",
    text: "#e0f2fe",
    muted: "#7dd3fc",
    barTrack: "rgba(255,255,255,0.08)",
    barFill: "linear-gradient(90deg,#0284c7,#38bdf8)",
    chipBg: "rgba(56,189,248,0.15)",
    motif: "wave"
  },
  qwen: {
    id: "qwen",
    label: "Qwen",
    tagline: "触角学伴 · 好奇卷须",
    accent: "#c084fc",
    accentSoft: "rgba(192,132,252,0.18)",
    accentGlow: "rgba(168,85,247,0.3)",
    panelBg: "linear-gradient(160deg,#1a1028 0%,#120c1c 100%)",
    panelBorder: "rgba(192,132,252,0.35)",
    text: "#f3e8ff",
    muted: "#d8b4fe",
    barTrack: "rgba(255,255,255,0.08)",
    barFill: "linear-gradient(90deg,#9333ea,#c084fc)",
    chipBg: "rgba(192,132,252,0.15)",
    motif: "orb"
  },
  claude: {
    id: "claude",
    label: "Claude",
    tagline: "橙蟹学伴 · 暖爪相伴",
    accent: "#fb923c",
    accentSoft: "rgba(251,146,60,0.18)",
    accentGlow: "rgba(249,115,22,0.3)",
    panelBg: "linear-gradient(160deg,#2a1810 0%,#1a100c 100%)",
    panelBorder: "rgba(251,146,60,0.35)",
    text: "#fff7ed",
    muted: "#fdba74",
    barTrack: "rgba(255,255,255,0.08)",
    barFill: "linear-gradient(90deg,#ea580c,#fb923c)",
    chipBg: "rgba(251,146,60,0.15)",
    motif: "claw"
  },
  copilot: {
    id: "copilot",
    label: "Copilot",
    tagline: "彩带学伴 · 待唤醒",
    accent: "#60a5fa",
    accentSoft: "rgba(96,165,250,0.18)",
    accentGlow: "rgba(59,130,246,0.3)",
    panelBg: "linear-gradient(160deg,#0f172a 0%,#111827 100%)",
    panelBorder: "rgba(96,165,250,0.35)",
    text: "#eff6ff",
    muted: "#93c5fd",
    barTrack: "rgba(255,255,255,0.08)",
    barFill: "linear-gradient(90deg,#3b82f6,#a855f7)",
    chipBg: "rgba(96,165,250,0.15)",
    motif: "ribbon"
  }
}

export function getPetTheme(id: PetCharacterId): PetTheme {
  return PET_THEMES[id] ?? PET_THEMES.gpt
}
