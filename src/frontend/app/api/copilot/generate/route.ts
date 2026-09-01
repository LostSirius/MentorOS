import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import Anthropic from "@anthropic-ai/sdk"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/local/supabase-js"
import { Database } from "@/supabase/types"
import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

export const runtime = "nodejs"

interface GeneratePayload {
  chatSettings: ChatSettings
  messages: any[]
  provider: string
  customModelId?: string
}

async function callOpenAICompatible(
  apiKey: string,
  baseURL: string | undefined,
  chatSettings: ChatSettings,
  messages: any[]
): Promise<string> {
  const client = new OpenAI({
    apiKey: apiKey || "",
    baseURL
  })

  const response = await client.chat.completions.create({
    model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
    messages: messages as ChatCompletionCreateParamsBase["messages"],
    temperature: chatSettings.temperature,
    max_tokens: 4096,
    stream: false
  })

  return response.choices[0]?.message?.content || ""
}

async function callAnthropic(
  apiKey: string,
  chatSettings: ChatSettings,
  messages: any[]
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: apiKey || "",
    ...(process.env.ANTHROPIC_BASE_URL
      ? { baseURL: process.env.ANTHROPIC_BASE_URL }
      : {})
  })

  const systemMessage = messages.find((m: any) => m.role === "system")
  const chatMessages = messages.filter((m: any) => m.role !== "system")

  const model = chatSettings.model || process.env.ANTHROPIC_MODEL || ""

  const response = await anthropic.messages.create({
    model,
    messages: chatMessages,
    temperature: chatSettings.temperature,
    system: systemMessage?.content || "",
    max_tokens: 4096
  })

  const content = response.content[0]
  return content.type === "text" ? content.text : ""
}

async function callGoogle(
  apiKey: string,
  chatSettings: ChatSettings,
  messages: any[]
): Promise<string> {
  const systemTexts: string[] = []
  const turns: { role: "user" | "model"; parts: { text: string }[] }[] = []

  for (const m of messages || []) {
    const text =
      typeof m.content === "string"
        ? m.content
        : Array.isArray(m.content)
          ? m.content.map((p: any) => p?.text || "").join("")
          : ""
    if (!text) continue

    if (m.role === "system") {
      systemTexts.push(text)
      continue
    }

    const role: "user" | "model" =
      m.role === "assistant" || m.role === "model" ? "model" : "user"
    const last = turns[turns.length - 1]
    if (last && last.role === role) {
      last.parts[0].text += "\n" + text
    } else {
      turns.push({ role, parts: [{ text }] })
    }
  }

  if (!turns.length) {
    throw new Error("No messages to send to Gemini")
  }

  while (turns.length > 1 && turns[0].role !== "user") {
    turns.shift()
  }

  const last = turns[turns.length - 1]
  const history = turns.slice(0, -1)
  while (history.length && history[0].role !== "user") {
    history.shift()
  }

  const genAI = new GoogleGenerativeAI(apiKey || "")
  const model = genAI.getGenerativeModel({
    model: chatSettings.model,
    ...(systemTexts.length
      ? { systemInstruction: systemTexts.join("\n\n") }
      : {})
  })

  const chat = model.startChat({
    history,
    generationConfig: {
      temperature: chatSettings.temperature,
      maxOutputTokens: 4096
    }
  })

  const result = await chat.sendMessage(last.parts)
  return result.response.text()
}

export async function POST(request: NextRequest) {
  const json = await request.json()
  const { chatSettings, messages, provider, customModelId } =
    json as GeneratePayload

  try {
    const profile = await getServerProfile()

    let content = ""

    if (
      provider === "openai" ||
      provider === "mistral" ||
      provider === "groq" ||
      provider === "openrouter" ||
      provider === "perplexity"
    ) {
      const keyMap: Record<string, string> = {
        openai: profile.openai_api_key || "",
        mistral: profile.mistral_api_key || "",
        groq: profile.groq_api_key || "",
        openrouter: profile.openrouter_api_key || "",
        perplexity: profile.perplexity_api_key || ""
      }

      const baseURLMap: Record<string, string | undefined> = {
        openai: process.env.OPENAI_API_BASE || undefined,
        mistral: "https://api.mistral.ai/v1",
        groq: "https://api.groq.com/openai/v1",
        openrouter: "https://openrouter.ai/api/v1",
        perplexity: "https://api.perplexity.ai/"
      }

      checkApiKey(keyMap[provider], provider)

      content = await callOpenAICompatible(
        keyMap[provider],
        baseURLMap[provider],
        chatSettings,
        messages
      )
    } else if (provider === "azure") {
      checkApiKey(profile.azure_openai_api_key, "Azure OpenAI")

      const ENDPOINT = profile.azure_openai_endpoint
      const KEY = profile.azure_openai_api_key

      let DEPLOYMENT_ID = ""
      switch (chatSettings.model) {
        case "gpt-3.5-turbo":
          DEPLOYMENT_ID = profile.azure_openai_35_turbo_id || ""
          break
        case "gpt-4-turbo-preview":
          DEPLOYMENT_ID = profile.azure_openai_45_turbo_id || ""
          break
        default:
          return NextResponse.json(
            { message: "Model not found" },
            { status: 400 }
          )
      }

      if (!ENDPOINT || !KEY || !DEPLOYMENT_ID) {
        return NextResponse.json(
          { message: "Azure resources not found" },
          { status: 400 }
        )
      }

      const azureOpenai = new OpenAI({
        apiKey: KEY,
        baseURL: `${ENDPOINT}/openai/deployments/${DEPLOYMENT_ID}`,
        defaultQuery: { "api-version": "2023-12-01-preview" },
        defaultHeaders: { "api-key": KEY }
      })

      const response = await azureOpenai.chat.completions.create({
        model: DEPLOYMENT_ID as ChatCompletionCreateParamsBase["model"],
        messages: messages as ChatCompletionCreateParamsBase["messages"],
        temperature: chatSettings.temperature,
        max_tokens: 4096,
        stream: false
      })

      content = response.choices[0]?.message?.content || ""
    } else if (provider === "custom") {
      if (!customModelId) {
        return NextResponse.json(
          { message: "Custom model ID not found" },
          { status: 400 }
        )
      }

      const supabaseAdmin = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: customModel, error } = await supabaseAdmin
        .from("models")
        .select("*")
        .eq("id", customModelId)
        .single()

      if (!customModel || error) {
        return NextResponse.json(
          { message: error?.message || "Custom model not found" },
          { status: 400 }
        )
      }

      content = await callOpenAICompatible(
        customModel.api_key || "",
        customModel.base_url,
        chatSettings,
        messages
      )
    } else if (provider === "supervisor-skills") {
      const apiKey = process.env.SUPERVISOR_SKILLS_API_KEY || "sk-demo"
      const backendUrl =
        process.env.SUPERVISOR_SKILLS_BACKEND_URL || "http://localhost:6000"

      // The supervisor-skills backend overrides system prompts with skill prompts.
      // Move the system prompt into the user message to preserve it.
      const supervisorMessages = [...messages]
      const systemIdx = supervisorMessages.findIndex(
        (m: any) => m.role === "system"
      )
      const userIdx = supervisorMessages.findIndex(
        (m: any) => m.role === "user"
      )
      if (systemIdx !== -1 && userIdx !== -1) {
        const systemContent = supervisorMessages[systemIdx].content
        const userContent = supervisorMessages[userIdx].content
        supervisorMessages.splice(systemIdx, 1)
        const newUserIdx = supervisorMessages.findIndex(
          (m: any) => m.role === "user"
        )
        supervisorMessages[newUserIdx] = {
          role: "user",
          content: `[System Instruction]\n${systemContent}\n\n[User Request]\n${userContent}`
        }
      }

      content = await callOpenAICompatible(
        apiKey,
        `${backendUrl}/v1`,
        chatSettings,
        supervisorMessages
      )
    } else if (provider === "ollama") {
      const ollamaUrl =
        process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434"
      content = await callOpenAICompatible(
        "ollama",
        `${ollamaUrl}/v1`,
        chatSettings,
        messages
      )
    } else if (provider === "anthropic") {
      checkApiKey(profile.anthropic_api_key, "Anthropic")
      content = await callAnthropic(
        profile.anthropic_api_key || "",
        chatSettings,
        messages
      )
    } else if (provider === "google") {
      checkApiKey(profile.google_gemini_api_key, "Google")
      content = await callGoogle(
        profile.google_gemini_api_key || "",
        chatSettings,
        messages
      )
    } else {
      return NextResponse.json(
        { message: `Unsupported provider: ${provider}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ content })
  } catch (error: any) {
    const isConnectionError =
      /connect|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed|network/i.test(
        error.message || ""
      )

    if (isConnectionError && provider !== "ollama") {
      try {
        const ollamaUrl =
          process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434"

        const tagsResp = await fetch(`${ollamaUrl}/api/tags`, {
          signal: AbortSignal.timeout(3000)
        })
        if (tagsResp.ok) {
          const tags = await tagsResp.json()
          const firstModel = tags?.models?.[0]?.name
          if (firstModel) {
            const ollamaContent = await callOpenAICompatible(
              "ollama",
              `${ollamaUrl}/v1`,
              { ...chatSettings, model: firstModel as any },
              messages
            )
            return NextResponse.json({
              content: ollamaContent,
              _fallback: "ollama"
            })
          }
        }
      } catch {
        // Ollama fallback also failed, return original error
      }
    }

    const errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return NextResponse.json({ message: errorMessage }, { status: errorCode })
  }
}
