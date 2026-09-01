/** Growth economy — research-first, soft caps (P0). */

export type GrowthEventId =
  | "literature_done"
  | "idea_done"
  | "experiment_done"
  | "writing_done"
  | "figures_done"
  | "review_done"
  | "polish_done"
  | "chat_success"
  | "daily_checkin"
  | "pet_poke"

export type GrowthReward = {
  xp: number
  ink: number
  bond: number
  dailyCap: number
}

export const GROWTH_TABLE: Record<GrowthEventId, GrowthReward> = {
  literature_done: { xp: 25, ink: 8, bond: 2, dailyCap: 2 },
  idea_done: { xp: 20, ink: 6, bond: 2, dailyCap: 3 },
  experiment_done: { xp: 22, ink: 6, bond: 2, dailyCap: 2 },
  writing_done: { xp: 18, ink: 5, bond: 2, dailyCap: 3 },
  figures_done: { xp: 15, ink: 5, bond: 1, dailyCap: 3 },
  review_done: { xp: 28, ink: 8, bond: 3, dailyCap: 2 },
  polish_done: { xp: 20, ink: 6, bond: 2, dailyCap: 2 },
  chat_success: { xp: 3, ink: 1, bond: 1, dailyCap: 8 },
  daily_checkin: { xp: 5, ink: 2, bond: 1, dailyCap: 1 },
  pet_poke: { xp: 0, ink: 0, bond: 1, dailyCap: 12 }
}

export function xpToNextLevel(level: number): number {
  return Math.round(80 * Math.pow(Math.max(1, level), 1.35))
}

export type StageId = 0 | 1 | 2 | 3 | 4

export function stageFromLevel(level: number): StageId {
  if (level <= 0) return 0
  if (level <= 5) return 1
  if (level <= 12) return 2
  if (level <= 20) return 3
  return 4
}

export const STAGE_LABELS: Record<StageId, string> = {
  0: "草稿胚",
  1: "文献崽",
  2: "实验仔",
  3: "审稿灵",
  4: "Mentor使魔"
}
