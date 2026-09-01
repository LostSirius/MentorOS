/**
 * One-shot localStorage key migration (Scholar Canvas → MentorOS).
 * Copies old → new when new is missing, then drops the legacy key.
 */

const LEGACY_PREFIX = "scholar-canvas-"
const LEGACY_PET_PREFIX = "scholar-pet-"

export function migrateLocalStorageKey(oldKey: string, newKey: string): void {
  if (typeof window === "undefined") return
  if (oldKey === newKey) return
  try {
    if (localStorage.getItem(newKey) != null) return
    const prev = localStorage.getItem(oldKey)
    if (prev == null) return
    localStorage.setItem(newKey, prev)
    localStorage.removeItem(oldKey)
  } catch {
    /* ignore quota / private mode */
  }
}

/** Migrate known MentorOS keys from pre-rename Scholar Canvas storage. */
export function migrateMentorOsStorageKeys(
  pairs: Array<[legacyKey: string, nextKey: string]>
): void {
  for (const [legacy, next] of pairs) {
    migrateLocalStorageKey(legacy, next)
  }
}

export function legacyScholarCanvasKey(mentorosKey: string): string {
  if (mentorosKey.startsWith("mentoros-")) {
    return LEGACY_PREFIX + mentorosKey.slice("mentoros-".length)
  }
  if (mentorosKey.startsWith("mentoros-pet-") || mentorosKey.startsWith("mentoros_pet")) {
    return mentorosKey.replace(/^mentoros-?pet-?/, LEGACY_PET_PREFIX)
  }
  return mentorosKey
}
