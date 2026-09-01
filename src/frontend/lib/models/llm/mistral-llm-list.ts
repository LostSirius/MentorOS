import { LLM } from "@/types"

const LINK = "https://docs.mistral.ai/getting-started/models/"

function m(id: string, name: string, pricing?: LLM["pricing"]): LLM {
  return {
    modelId: id,
    modelName: name,
    provider: "mistral",
    hostedId: id,
    platformLink: LINK,
    imageInput: false,
    pricing
  }
}

/** Catalog refreshed Aug 2026 from Mistral docs. */
export const MISTRAL_LLM_LIST: LLM[] = [
  m("mistral-large-latest", "Mistral Large"),
  m("mistral-medium-latest", "Mistral Medium 3.5"),
  m("mistral-small-latest", "Mistral Small 4"),
  m("mistral-small-2603", "Mistral Small 4 (2603)"),
  m("ministral-8b-latest", "Ministral 8B"),
  m("ministral-3b-latest", "Ministral 3B"),
  m("codestral-latest", "Codestral"),
  m("pixtral-large-latest", "Pixtral Large"),
  m("mistral-tiny", "Mistral Tiny (legacy)")
]
