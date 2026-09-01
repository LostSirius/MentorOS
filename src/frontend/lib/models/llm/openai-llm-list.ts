import { LLM } from "@/types"

const LINK = "https://platform.openai.com/docs/models"

function m(
  id: string,
  name: string,
  opts?: Partial<LLM>
): LLM {
  return {
    modelId: id,
    modelName: name,
    provider: "openai",
    hostedId: id,
    platformLink: LINK,
    imageInput: opts?.imageInput ?? true,
    pricing: opts?.pricing
  }
}

/** Catalog refreshed Aug 2026 from OpenAI model docs + common proxy aliases. */
export const OPENAI_LLM_LIST: LLM[] = [
  // Current generation
  m("gpt-5.6", "GPT-5.6"),
  m("gpt-5.6-sol", "GPT-5.6 Sol"),
  m("gpt-5.6-terra", "GPT-5.6 Terra"),
  m("gpt-5.6-luna", "GPT-5.6 Luna"),
  m("gpt-5.2", "GPT-5.2"),
  m("gpt-5.1", "GPT-5.1"),
  m("gpt-5", "GPT-5"),
  m("gpt-4.1", "GPT-4.1"),
  m("gpt-4.1-mini", "GPT-4.1 Mini"),
  m("gpt-4.1-nano", "GPT-4.1 Nano"),
  m("gpt-4o", "GPT-4o"),
  m("gpt-4o-mini", "GPT-4o Mini"),
  m("gpt-4-turbo", "GPT-4 Turbo"),
  m("gpt-4-turbo-preview", "GPT-4 Turbo (legacy)"),
  m("chatgpt-4o-latest", "ChatGPT-4o Latest"),
  // Reasoning
  m("o4-mini", "o4-mini", { imageInput: false }),
  m("o3", "o3", { imageInput: false }),
  m("o3-mini", "o3-mini", { imageInput: false }),
  m("o3-pro", "o3-pro", { imageInput: false }),
  m("o1", "o1", { imageInput: false }),
  m("o1-pro", "o1-pro", { imageInput: false }),
  m("o1-mini", "o1-mini", { imageInput: false })
]
