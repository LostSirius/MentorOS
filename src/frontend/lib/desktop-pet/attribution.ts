export interface PetAttribution {
  id: string
  title: string
  summary: string
  upstreamUrl: string
  licenseNotes: string[]
  mustDisplay: boolean
}

export const PET_ATTRIBUTIONS: Record<string, PetAttribution> = {
  "mascot-pack": {
    id: "mascot-pack",
    title: "MentorOS desktop pets",
    summary:
      "Original character pack for GPT / Gemini / Grok / DeepSeek / Qwen / Claude.",
    upstreamUrl: "",
    licenseNotes: [
      "Project-owned mascot assets under assets/desktop-pet/ (shipped copies in public/pets/qpack/)."
    ],
    mustDisplay: false
  }
}
