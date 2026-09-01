import { PET_CHARACTERS } from "./catalog"
import type { PetAction, PetCharacterId } from "./types"

export type ScholarPetTrigger =
  | "idle"
  | "generating"
  | "streaming"
  | "success"
  | "error"
  | "notification"
  | "poke"
  | "drag"
  | "doublePoke"

/** Map app events → a concrete animation action (simple web MVP). */
export function mapTriggerToAction(trigger: ScholarPetTrigger): PetAction {
  switch (trigger) {
    case "generating":
      return "thinking"
    case "streaming":
      return "working"
    case "success":
      return "happy"
    case "error":
      return "error"
    case "notification":
      return "notification"
    case "poke":
      return "happy"
    case "drag":
      return "working"
    case "doublePoke":
      return "juggling"
    case "idle":
    default:
      return "idle"
  }
}

const ACTION_FALLBACKS: Partial<Record<PetAction, PetAction[]>> = {
  clickLeft: ["happy", "idle"],
  clickRight: ["happy", "idle"],
  double: ["juggling", "happy", "idle"],
  drag: ["working", "idle"],
  yawning: ["idleLook", "idle"],
  sleeping: ["idle"],
  waking: ["happy", "idle"],
  annoyed: ["error", "idle"],
  building: ["working", "idle"],
  juggling: ["working", "happy", "idle"],
  notification: ["happy", "idle"],
  idleLook: ["idle"]
}

export function resolvePetAssetUrl(
  character: PetCharacterId,
  action: PetAction
): string | null {
  const pack = PET_CHARACTERS[character]
  const table = pack ? pack["actions"] : undefined
  if (!table) return null

  const tryOrder: PetAction[] = [
    action,
    ...(ACTION_FALLBACKS[action] ?? []),
    "idle"
  ]

  for (const key of tryOrder) {
    const asset = table[key]
    if (asset?.publicPath) return asset.publicPath
  }
  return null
}

export function listConfiguredActions(character: PetCharacterId): PetAction[] {
  const pack = PET_CHARACTERS[character]
  return Object.keys(pack ? pack["actions"] : {}) as PetAction[]
}
