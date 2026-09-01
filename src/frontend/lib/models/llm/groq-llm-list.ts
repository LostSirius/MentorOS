import { LLM } from "@/types"

const LINK = "https://console.groq.com/docs/models"

function m(
  id: string,
  name: string,
  pricing?: LLM["pricing"]
): LLM {
  return {
    modelId: id,
    modelName: name,
    provider: "groq",
    hostedId: id,
    platformLink: LINK,
    imageInput: false,
    pricing
  }
}

/** Catalog refreshed Aug 2026 from GroqCloud docs. */
export const GROQ_LLM_LIST: LLM[] = [
  m("openai/gpt-oss-120b", "GPT-OSS 120B", {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.15,
    outputCost: 0.6
  }),
  m("openai/gpt-oss-20b", "GPT-OSS 20B", {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.075,
    outputCost: 0.3
  }),
  m("qwen/qwen3.6-27b", "Qwen3.6 27B", {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.6,
    outputCost: 3
  }),
  m("llama-3.3-70b-versatile", "Llama 3.3 70B Versatile", {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.59,
    outputCost: 0.79
  }),
  m("llama-3.1-8b-instant", "Llama 3.1 8B Instant", {
    currency: "USD",
    unit: "1M tokens",
    inputCost: 0.05,
    outputCost: 0.08
  }),
  m("groq/compound", "Groq Compound"),
  m("groq/compound-mini", "Groq Compound Mini"),
  // Legacy IDs still seen in older clients
  m("llama3-70b-8192", "LLaMA3 70B (legacy)"),
  m("llama3-8b-8192", "LLaMA3 8B (legacy)"),
  m("mixtral-8x7b-32768", "Mixtral 8x7B (legacy)"),
  m("gemma-7b-it", "Gemma 7B IT (legacy)")
]
