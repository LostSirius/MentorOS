import {
  GROWTH_TABLE,
  STAGE_LABELS,
  stageFromLevel,
  xpToNextLevel,
  type GrowthEventId,
  type StageId
} from "./economy"
import { migrateLocalStorageKey } from "@/lib/migrate-storage-keys"

const STORAGE_KEY = "mentoros-pet-profile-v1"
const PROFILE_EVENT = "mentoros-pet-profile"

export type PetProfile = {
  /** User-chosen nickname; empty → fall back to character label. */
  name: string
  level: number
  xp: number
  bond: number
  ink: number
  vigor: number
  mood: number
  lastActiveAt: string
  lastVigorAt: string
  /** YYYY-MM-DD → eventId → count */
  daily: Record<string, Record<string, number>>
  badges: string[]
  streakDays: number
  lastStreakDate: string
}

export type AwardResult = {
  profile: PetProfile
  gained: { xp: number; ink: number; bond: number }
  leveledUp: boolean
  capped: boolean
  stage: StageId
  stageLabel: string
}

function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function defaultProfile(): PetProfile {
  const now = new Date().toISOString()
  return {
    name: "",
    level: 1,
    xp: 0,
    bond: 10,
    ink: 12,
    vigor: 100,
    mood: 80,
    lastActiveAt: now,
    lastVigorAt: now,
    daily: {},
    badges: [],
    streakDays: 0,
    lastStreakDate: ""
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** Soft regen vigor over time (full ~5h). Soft mood decay after 3 idle days. */
export function tickProfile(p: PetProfile, now = Date.now()): PetProfile {
  const next = { ...p }
  const lastV = Date.parse(p.lastVigorAt || p.lastActiveAt) || now
  const hours = Math.max(0, (now - lastV) / 3600000)
  if (hours > 0.05) {
    next.vigor = clamp(p.vigor + hours * (100 / 5), 0, 100)
    next.lastVigorAt = new Date(now).toISOString()
  }
  const lastA = Date.parse(p.lastActiveAt) || now
  const idleDays = (now - lastA) / 86400000
  if (idleDays >= 3) {
    next.mood = clamp(40 - Math.min(20, (idleDays - 3) * 5), 15, 100)
  }
  return next
}

export function loadPetProfile(): PetProfile {
  if (typeof window === "undefined") return defaultProfile()
  try {
    migrateLocalStorageKey("scholar-pet-profile-v1", STORAGE_KEY)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProfile()
    const parsed = { ...defaultProfile(), ...JSON.parse(raw) } as PetProfile
    return tickProfile(parsed)
  } catch {
    return defaultProfile()
  }
}

export function savePetProfile(p: PetProfile) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: p }))
}

export const PET_NAME_MAX = 16

/** Sanitize and persist a custom nickname. Empty clears to character default. */
export function setPetName(raw: string): PetProfile {
  const name = raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, PET_NAME_MAX)
  const profile = { ...tickProfile(loadPetProfile()), name }
  savePetProfile(profile)
  return profile
}

/** Nickname if set, otherwise the character / familiar fallback. */
export function displayPetName(
  profile: PetProfile,
  fallback: string
): string {
  const n = (profile.name || "").trim()
  return n || fallback
}

function applyLeveling(p: PetProfile): { profile: PetProfile; leveledUp: boolean } {
  let leveledUp = false
  let { level, xp } = p
  let need = xpToNextLevel(level)
  while (xp >= need && level < 99) {
    xp -= need
    level += 1
    leveledUp = true
    need = xpToNextLevel(level)
  }
  return { profile: { ...p, level, xp }, leveledUp }
}

function bumpStreak(p: PetProfile): PetProfile {
  const today = todayKey()
  if (p.lastStreakDate === today) return p
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yesterday = todayKey(y)
  const streak =
    p.lastStreakDate === yesterday ? p.streakDays + 1 : 1
  return { ...p, streakDays: streak, lastStreakDate: today }
}

export function awardGrowth(
  eventId: GrowthEventId,
  opts?: { quality?: "ok" | "warn" | "block" }
): AwardResult {
  const table = GROWTH_TABLE[eventId]
  let profile = tickProfile(loadPetProfile())
  const day = todayKey()
  const used = profile.daily[day]?.[eventId] ?? 0

  if (opts?.quality === "block") {
    return {
      profile,
      gained: { xp: 0, ink: 0, bond: 0 },
      leveledUp: false,
      capped: false,
      stage: stageFromLevel(profile.level),
      stageLabel: STAGE_LABELS[stageFromLevel(profile.level)]
    }
  }

  if (used >= table.dailyCap) {
    return {
      profile,
      gained: { xp: 0, ink: 0, bond: 0 },
      leveledUp: false,
      capped: true,
      stage: stageFromLevel(profile.level),
      stageLabel: STAGE_LABELS[stageFromLevel(profile.level)]
    }
  }

  const mult = opts?.quality === "warn" ? 0.6 : 1
  const gained = {
    xp: Math.round(table.xp * mult),
    ink: Math.round(table.ink * mult),
    bond: Math.round(table.bond * mult)
  }

  profile = {
    ...profile,
    xp: profile.xp + gained.xp,
    ink: profile.ink + gained.ink,
    bond: clamp(profile.bond + gained.bond, 0, 999),
    mood: clamp(profile.mood + 4, 0, 100),
    vigor: clamp(profile.vigor + 3, 0, 100),
    lastActiveAt: new Date().toISOString(),
    daily: {
      ...profile.daily,
      [day]: {
        ...(profile.daily[day] || {}),
        [eventId]: used + 1
      }
    }
  }
  profile = bumpStreak(profile)

  // Lightweight badges (stable ids for i18n)
  const badges = new Set(profile.badges)
  // migrate legacy Chinese badge ids
  if (badges.has("开题铃铛")) {
    badges.delete("开题铃铛")
    badges.add("ideaBell")
  }
  if (badges.has("三日连研")) {
    badges.delete("三日连研")
    badges.add("streak3")
  }
  if (badges.has("七日连研")) {
    badges.delete("七日连研")
    badges.add("streak7")
  }
  if (eventId === "idea_done") badges.add("ideaBell")
  if (profile.streakDays >= 3) badges.add("streak3")
  if (profile.streakDays >= 7) badges.add("streak7")
  profile.badges = Array.from(badges)

  const leveled = applyLeveling(profile)
  profile = leveled.profile
  savePetProfile(profile)

  const stage = stageFromLevel(profile.level)
  return {
    profile,
    gained,
    leveledUp: leveled.leveledUp,
    capped: false,
    stage,
    stageLabel: STAGE_LABELS[stage]
  }
}

export function subscribePetProfile(handler: (p: PetProfile) => void) {
  if (typeof window === "undefined") return () => {}
  const fn = (e: Event) => {
    const ce = e as CustomEvent<PetProfile>
    if (ce.detail) handler(ce.detail)
  }
  window.addEventListener(PROFILE_EVENT, fn)
  return () => window.removeEventListener(PROFILE_EVENT, fn)
}

export function xpProgress(p: PetProfile) {
  const need = xpToNextLevel(p.level)
  return { need, ratio: clamp(p.xp / need, 0, 1) }
}
