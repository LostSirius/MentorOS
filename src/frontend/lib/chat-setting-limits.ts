type ChatSettingLimits = {
  MIN_TEMPERATURE: number
  MAX_TEMPERATURE: number
  MAX_TOKEN_OUTPUT_LENGTH: number
  MAX_CONTEXT_LENGTH: number
}

const DEFAULT_LIMITS: ChatSettingLimits = {
  MIN_TEMPERATURE: 0.0,
  MAX_TEMPERATURE: 1.0,
  MAX_TOKEN_OUTPUT_LENGTH: 8192,
  MAX_CONTEXT_LENGTH: 128000
}

const anthropicLimits = (
  maxOut = 8192,
  ctx = 200000
): ChatSettingLimits => ({
  MIN_TEMPERATURE: 0.0,
  MAX_TEMPERATURE: 1.0,
  MAX_TOKEN_OUTPUT_LENGTH: maxOut,
  MAX_CONTEXT_LENGTH: ctx
})

const openaiLimits = (
  maxOut = 16384,
  ctx = 128000,
  maxTemp = 2.0
): ChatSettingLimits => ({
  MIN_TEMPERATURE: 0.0,
  MAX_TEMPERATURE: maxTemp,
  MAX_TOKEN_OUTPUT_LENGTH: maxOut,
  MAX_CONTEXT_LENGTH: ctx
})

const googleLimits = (
  maxOut = 8192,
  ctx = 1040384
): ChatSettingLimits => ({
  MIN_TEMPERATURE: 0.0,
  MAX_TEMPERATURE: 1.0,
  MAX_TOKEN_OUTPUT_LENGTH: maxOut,
  MAX_CONTEXT_LENGTH: ctx
})

export const CHAT_SETTING_LIMITS: Record<string, ChatSettingLimits> = {
  // Anthropic — current
  "claude-fable-5": anthropicLimits(64000, 200000),
  "claude-opus-5": anthropicLimits(64000, 200000),
  "claude-sonnet-5": anthropicLimits(64000, 200000),
  "claude-haiku-4-5": anthropicLimits(64000, 200000),
  "claude-haiku-4-5-20251001": anthropicLimits(64000, 200000),
  "claude-opus-4-8": anthropicLimits(32000, 200000),
  "claude-opus-4-7": anthropicLimits(32000, 200000),
  "claude-opus-4-6": anthropicLimits(32000, 200000),
  "claude-sonnet-4-6": anthropicLimits(64000, 200000),
  "claude-sonnet-4-5": anthropicLimits(64000, 200000),
  "claude-sonnet-4-5-20250929": anthropicLimits(64000, 200000),
  "claude-opus-4-5": anthropicLimits(64000, 200000),
  "claude-opus-4-5-20251101": anthropicLimits(64000, 200000),
  "claude-sonnet-4-20250514": anthropicLimits(),
  "claude-opus-4-20250514": anthropicLimits(),
  "claude-3-7-sonnet-20250219": anthropicLimits(),
  "claude-3-5-sonnet-20241022": anthropicLimits(),
  "claude-3-5-sonnet-20240620": anthropicLimits(),
  "claude-3-5-haiku-20241022": anthropicLimits(),
  "claude-3-haiku-20240307": anthropicLimits(4096),
  "claude-3-sonnet-20240229": anthropicLimits(4096),
  "claude-3-opus-20240229": anthropicLimits(4096),

  // Google
  "gemini-flash-latest": googleLimits(65536, 1048576),
  "gemini-pro-latest": googleLimits(65536, 1048576),
  "gemini-3.6-flash": googleLimits(65536, 1048576),
  "gemini-3.5-flash": googleLimits(65536, 1048576),
  "gemini-3.1-flash-lite": googleLimits(65536, 1048576),
  "gemini-3.1-pro-preview": googleLimits(65536, 1048576),
  "gemini-2.5-pro": googleLimits(65536, 1048576),
  "gemini-2.5-flash": googleLimits(65536, 1048576),
  "gemini-2.5-flash-lite": googleLimits(65536, 1048576),
  "gemini-2.0-flash": googleLimits(),
  "gemini-2.0-flash-lite": googleLimits(),
  "gemini-1.5-flash": googleLimits(),
  "gemini-1.5-pro-latest": googleLimits(),

  // Mistral
  "mistral-tiny": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 2000,
    MAX_CONTEXT_LENGTH: 8000
  },
  "mistral-small-latest": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 128000
  },
  "mistral-small-2603": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 128000
  },
  "mistral-medium-latest": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 128000
  },
  "mistral-large-latest": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 128000
  },
  "ministral-8b-latest": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 128000
  },
  "ministral-3b-latest": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 128000
  },
  "codestral-latest": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 256000
  },
  "pixtral-large-latest": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 128000
  },

  // Groq
  "openai/gpt-oss-120b": openaiLimits(65536, 131072, 1.0),
  "openai/gpt-oss-20b": openaiLimits(65536, 131072, 1.0),
  "qwen/qwen3.6-27b": openaiLimits(32768, 131072, 1.0),
  "llama-3.3-70b-versatile": openaiLimits(32768, 131072, 1.0),
  "llama-3.1-8b-instant": openaiLimits(8192, 131072, 1.0),
  "groq/compound": openaiLimits(8192, 131072, 1.0),
  "groq/compound-mini": openaiLimits(8192, 131072, 1.0),
  "llama3-8b-8192": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 8192
  },
  "llama3-70b-8192": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 8192
  },
  "mixtral-8x7b-32768": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 4096,
    MAX_CONTEXT_LENGTH: 32768
  },
  "gemma-7b-it": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 2.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 8192
  },

  // OpenAI — GPT-5.6 family
  "gpt-5.6": openaiLimits(128000, 1000000),
  "gpt-5.6-sol": openaiLimits(128000, 1000000),
  "gpt-5.6-terra": openaiLimits(128000, 1000000),
  "gpt-5.6-luna": openaiLimits(128000, 1000000),
  "gpt-5.2": openaiLimits(32768, 256000),
  "gpt-5.1": openaiLimits(32768, 256000),
  "gpt-5": openaiLimits(32768, 256000),
  "gpt-4.1": openaiLimits(32768, 1047576),
  "gpt-4.1-mini": openaiLimits(32768, 1047576),
  "gpt-4.1-nano": openaiLimits(32768, 1047576),
  "gpt-4o": openaiLimits(16384, 128000),
  "gpt-4o-mini": openaiLimits(16384, 128000),
  "chatgpt-4o-latest": openaiLimits(16384, 128000),
  "gpt-4-turbo": openaiLimits(4096, 128000),
  "gpt-4-turbo-preview": openaiLimits(4096, 128000),
  "gpt-4": openaiLimits(4096, 8192),
  "gpt-3.5-turbo": openaiLimits(4096, 16385),
  // Reasoning
  o3: openaiLimits(100000, 200000),
  "o3-mini": openaiLimits(100000, 200000),
  "o3-pro": openaiLimits(100000, 200000),
  "o4-mini": openaiLimits(100000, 200000),
  o1: openaiLimits(100000, 200000),
  "o1-pro": openaiLimits(100000, 200000),
  "o1-mini": openaiLimits(65536, 128000),

  // Perplexity
  sonar: {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 127000
  },
  "sonar-pro": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 200000
  },
  "sonar-reasoning-pro": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 200000
  },
  "sonar-deep-research": {
    MIN_TEMPERATURE: 0.0,
    MAX_TEMPERATURE: 1.0,
    MAX_TOKEN_OUTPUT_LENGTH: 8192,
    MAX_CONTEXT_LENGTH: 200000
  }
}

export function getChatSettingLimits(modelId: string): ChatSettingLimits {
  return CHAT_SETTING_LIMITS[modelId] || DEFAULT_LIMITS
}
