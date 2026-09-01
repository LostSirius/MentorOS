export const MENTOROS_PET_EVENT = "mentoros-pet"
/** @deprecated Use MENTOROS_PET_EVENT */
export const SCHOLAR_PET_EVENT = MENTOROS_PET_EVENT

export type PetEventType =
  | "chat-success"
  | "chat-error"
  | "chat-cancelled"
  | "notify"
  | "research-progress"

/** @deprecated Use PetEventType */
export type ScholarPetEventType = PetEventType

export type PetEventDetail = {
  type: PetEventType
  message?: string
  /** Maps to GrowthEventId when type is research-progress or chat-success */
  growth?:
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
  quality?: "ok" | "warn" | "block"
}

/** @deprecated Use PetEventDetail */
export type ScholarPetEventDetail = PetEventDetail

export function emitPetEvent(detail: PetEventDetail) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<PetEventDetail>(MENTOROS_PET_EVENT, { detail })
  )
}

export function subscribePetEvents(handler: (detail: PetEventDetail) => void) {
  if (typeof window === "undefined") return () => {}
  const listener = (e: Event) => {
    const ce = e as CustomEvent<PetEventDetail>
    if (ce.detail) handler(ce.detail)
  }
  window.addEventListener(MENTOROS_PET_EVENT, listener)
  return () => window.removeEventListener(MENTOROS_PET_EVENT, listener)
}
