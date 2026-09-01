import { Tables } from "@/supabase/types"
import { LLM, LLMID, OpenRouterLLM } from "@/types"
import { toast } from "sonner"
import { LLM_LIST_MAP } from "./llm/llm-list"
import { buildAnthropicProxyModel } from "./llm/anthropic-llm-list"

function dedupeByModelId(models: LLM[]): LLM[] {
  const seen = new Set<string>()
  return models.filter(m => {
    if (seen.has(m.modelId)) return false
    seen.add(m.modelId)
    return true
  })
}

export const fetchHostedModels = async (profile: Tables<"profiles">) => {
  try {
    // Skills inject silently — do not list supervisor-skills as a selectable model
    const providers = ["google", "anthropic", "mistral", "groq", "perplexity"]

    if (profile.use_azure_openai) {
      providers.push("azure")
    } else {
      providers.push("openai")
    }

    const response = await fetch("/api/keys")

    if (!response.ok) {
      throw new Error(`Server is not responding.`)
    }

    const data = await response.json()
    const configured = data.configured || {}

    let modelsToAdd: LLM[] = []

    for (const provider of providers) {
      let providerKey: keyof typeof profile

      if (provider === "google") {
        providerKey = "google_gemini_api_key" as any
      } else if (provider === "azure") {
        providerKey = "azure_openai_api_key" as any
      } else {
        providerKey = `${provider}_api_key` as any
      }

      if (!(profile?.[providerKey] || data.isUsingEnvKeyMap[provider])) {
        continue
      }

      // Anthropic: show configured proxy model first, then full Claude catalog
      if (provider === "anthropic") {
        if (configured.anthropicProxy && configured.anthropicModel) {
          modelsToAdd.push(buildAnthropicProxyModel(configured.anthropicModel))
        }
        const models = LLM_LIST_MAP[provider]
        if (Array.isArray(models)) {
          modelsToAdd.push(...models)
        }
        continue
      }

      // OpenAI: merge static catalog with live proxy /v1/models list
      if (provider === "openai" && configured.openaiProxy) {
        const staticModels = LLM_LIST_MAP[provider] || []
        const proxyModels = await fetchOpenAIProxyModels()
        modelsToAdd.push(...dedupeByModelId([...proxyModels, ...staticModels]))
        continue
      }

      const models = LLM_LIST_MAP[provider]
      if (Array.isArray(models)) {
        modelsToAdd.push(...models)
      }
    }

    return {
      envKeyMap: data.isUsingEnvKeyMap,
      hostedModels: dedupeByModelId(modelsToAdd)
    }
  } catch (error) {
    console.warn("Error fetching hosted models: " + error)
  }
}

async function fetchOpenAIProxyModels(): Promise<LLM[]> {
  try {
    const res = await fetch("/api/models/proxy", { cache: "no-store" })
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data.models)) return []

    return data.models.map((m: { id: string; name?: string }): LLM => ({
      modelId: m.id as LLMID,
      modelName: m.name || m.id,
      provider: "openai",
      hostedId: m.id,
      platformLink: "https://platform.openai.com/docs/models",
      imageInput: true
    }))
  } catch {
    return []
  }
}

export const fetchOllamaModels = async () => {
  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_OLLAMA_URL + "/api/tags"
    )

    if (!response.ok) {
      throw new Error(`Ollama server is not responding.`)
    }

    const data = await response.json()

    const localModels: LLM[] = data.models.map((model: any) => ({
      modelId: model.name as LLMID,
      modelName: model.name,
      provider: "ollama",
      hostedId: model.name,
      platformLink: "https://ollama.ai/library",
      imageInput: false
    }))

    return localModels
  } catch (error) {
    console.warn("Error fetching Ollama models: " + error)
  }
}

export const fetchOpenRouterModels = async () => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models")

    if (!response.ok) {
      throw new Error(`OpenRouter server is not responding.`)
    }

    const { data } = await response.json()

    const openRouterModels = data.map(
      (model: {
        id: string
        name: string
        context_length: number
      }): OpenRouterLLM => ({
        modelId: model.id as LLMID,
        modelName: model.id,
        provider: "openrouter",
        hostedId: model.name,
        platformLink: "https://openrouter.dev",
        imageInput: false,
        maxContext: model.context_length
      })
    )

    return openRouterModels
  } catch (error) {
    console.error("Error fetching Open Router models: " + error)
    toast.error("Error fetching Open Router models: " + error)
  }
}
