export type {
  PetAction,
  PetAssetFormat,
  PetAssetSource,
  PetActionAsset,
  PetCharacterId,
  PetCharacterPack
} from "./types"
export {
  PET_CHARACTERS,
  DEFAULT_PET_CHARACTER,
  READY_PET_CHARACTER_IDS,
  resolvePetCharacter
} from "./catalog"
export { CLAUDE_CLAWD_BRIDGE, buildClaudeActionAssets } from "./clawd-bridge"
export {
  mapTriggerToAction,
  resolvePetAssetUrl,
  listConfiguredActions,
  type ScholarPetTrigger
} from "./resolve-asset"
export {
  emitPetEvent,
  subscribePetEvents,
  MENTOROS_PET_EVENT,
  SCHOLAR_PET_EVENT,
  type PetEventType,
  type PetEventDetail,
  type ScholarPetEventType,
  type ScholarPetEventDetail
} from "./events"
export {
  PET_ATTRIBUTIONS,
  getClaudeAttributionFooter
} from "./attribution"
export { usePetDriver } from "./use-pet-driver"
export { getPetTheme, PET_THEMES, type PetTheme } from "./themes"
export {
  awardGrowth,
  loadPetProfile,
  savePetProfile,
  setPetName,
  displayPetName,
  PET_NAME_MAX,
  subscribePetProfile,
  xpProgress,
  type PetProfile,
  type AwardResult
} from "./profile"
export {
  GROWTH_TABLE,
  STAGE_LABELS,
  xpToNextLevel,
  stageFromLevel,
  type GrowthEventId,
  type StageId
} from "./economy"
