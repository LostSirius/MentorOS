export interface PetAttribution {
  id: string
  title: string
  summary: string
  upstreamUrl: string
  licenseNotes: string[]
  mustDisplay: boolean
}

export const PET_ATTRIBUTIONS: Record<string, PetAttribution> = {
  "clawd-on-desk-claude": {
    id: "clawd-on-desk-claude",
    title: "Clawd (Claude mascot animations)",
    summary:
      "Claude pet animations are bridged from the Clawd theme in clawd-on-desk for local personal/dev use. Artwork is not redistributed by MentorOS.",
    upstreamUrl: "https://github.com/rullerzhou-afk/clawd-on-desk",
    licenseNotes: [
      "Source code of clawd-on-desk is AGPL-3.0; artwork under assets/ is All Rights Reserved (see assets/LICENSE).",
      "Clawd character is the property of Anthropic (https://www.anthropic.com). Fan pixel art may not be used for commercial purposes.",
      "Do not commit, redistribute, or publish the fetched SVG files. Keep them local via scripts/fetch-clawd-claude-assets.mjs.",
      "This project is unofficial and not affiliated with or endorsed by Anthropic or clawd-on-desk authors."
    ],
    mustDisplay: true
  },
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

export function getClaudeAttributionFooter(): string {
  const a = PET_ATTRIBUTIONS["clawd-on-desk-claude"]
  return `${a.title} — via ${a.upstreamUrl} (Anthropic Clawd IP; ARR artwork; local fetch only)`
}
