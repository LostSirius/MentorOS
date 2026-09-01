import { ModelProvider } from "."

/** Model IDs may be catalog entries or env/proxy-specific strings. */
export type LLMID = string

export type OpenAILLMID =
  | "gpt-5.6"
  | "gpt-5.6-sol"
  | "gpt-5.6-terra"
  | "gpt-5.6-luna"
  | "gpt-5.2"
  | "gpt-5.1"
  | "gpt-5"
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "chatgpt-4o-latest"
  | "gpt-4-turbo"
  | "gpt-4-turbo-preview"
  | "gpt-4"
  | "o3"
  | "o3-mini"
  | "o3-pro"
  | "o4-mini"
  | "o1"
  | "o1-pro"
  | "o1-mini"
  | "gpt-3.5-turbo"

export type GoogleLLMID =
  | "gemini-flash-latest"
  | "gemini-pro-latest"
  | "gemini-3.6-flash"
  | "gemini-3.5-flash"
  | "gemini-3.1-flash-lite"
  | "gemini-3.1-pro-preview"
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite"
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  | "gemini-1.5-pro-latest"
  | "gemini-1.5-flash"

export type AnthropicLLMID =
  | "claude-fable-5"
  | "claude-opus-5"
  | "claude-sonnet-5"
  | "claude-haiku-4-5"
  | "claude-haiku-4-5-20251001"
  | "claude-opus-4-8"
  | "claude-opus-4-7"
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "claude-sonnet-4-5"
  | "claude-sonnet-4-5-20250929"
  | "claude-opus-4-5"
  | "claude-opus-4-5-20251101"
  | "claude-sonnet-4-20250514"
  | "claude-opus-4-20250514"
  | "claude-3-7-sonnet-20250219"
  | "claude-3-5-sonnet-20241022"
  | "claude-3-5-sonnet-20240620"
  | "claude-3-5-haiku-20241022"
  | "claude-3-haiku-20240307"
  | "claude-3-sonnet-20240229"
  | "claude-3-opus-20240229"

export type MistralLLMID =
  | "mistral-tiny"
  | "mistral-small-latest"
  | "mistral-small-2603"
  | "mistral-medium-latest"
  | "mistral-large-latest"
  | "ministral-8b-latest"
  | "ministral-3b-latest"
  | "codestral-latest"
  | "pixtral-large-latest"

export type GroqLLMID =
  | "openai/gpt-oss-120b"
  | "openai/gpt-oss-20b"
  | "qwen/qwen3.6-27b"
  | "llama-3.3-70b-versatile"
  | "llama-3.1-8b-instant"
  | "groq/compound"
  | "groq/compound-mini"
  | "llama3-8b-8192"
  | "llama3-70b-8192"
  | "mixtral-8x7b-32768"
  | "gemma-7b-it"

export type PerplexityLLMID =
  | "sonar"
  | "sonar-pro"
  | "sonar-reasoning-pro"
  | "sonar-deep-research"

export type SupervisorSkillsLLMID = "supervisor-skills"

export interface LLM {
  modelId: LLMID
  modelName: string
  provider: ModelProvider
  hostedId: string
  platformLink: string
  imageInput: boolean
  pricing?: {
    currency: string
    unit: string
    inputCost: number
    outputCost?: number
  }
}

export interface OpenRouterLLM extends LLM {
  maxContext: number
}
