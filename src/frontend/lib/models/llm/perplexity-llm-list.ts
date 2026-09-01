import { LLM } from "@/types"

const LINK = "https://docs.perplexity.ai/docs/sonar/models/sonar"

function m(id: string, name: string): LLM {
  return {
    modelId: id,
    modelName: name,
    provider: "perplexity",
    hostedId: id,
    platformLink: LINK,
    imageInput: false
  }
}

/** Catalog refreshed Aug 2026 from Perplexity Sonar docs. */
export const PERPLEXITY_LLM_LIST: LLM[] = [
  m("sonar", "Sonar"),
  m("sonar-pro", "Sonar Pro"),
  m("sonar-reasoning-pro", "Sonar Reasoning Pro"),
  m("sonar-deep-research", "Sonar Deep Research")
]
