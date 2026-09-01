import { getServerProfile, checkApiKey } from "@/lib/server/server-chat-helpers"
import { loadSkillSystemPrompt } from "@/lib/server/load-skill"
import {
  buildScientificFeedbackUserPrompt,
  SCIENTIFIC_FEEDBACK_SYSTEM,
  ScientificPaperInput
} from "@/lib/scientific-feedback"
import { ChatSettings } from "@/types"
import Anthropic from "@anthropic-ai/sdk"
import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 120

type FeedbackBody = {
  chatSettings: ChatSettings
  provider?: string
  paper: ScientificPaperInput
}

async function callOpenAICompatible(
  apiKey: string,
  baseURL: string | undefined,
  model: string,
  system: string,
  user: string
) {
  const client = new OpenAI({ apiKey, baseURL })
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  })
  return completion.choices[0]?.message?.content || ""
}

async function callAnthropic(apiKey: string, model: string, system: string, user: string) {
  const anthropic = new Anthropic({
    apiKey,
    ...(process.env.ANTHROPIC_BASE_URL
      ? { baseURL: process.env.ANTHROPIC_BASE_URL }
      : {})
  })
  const response = await anthropic.messages.create({
    model: model || process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: 8192,
    temperature: 0.4,
    system,
    messages: [{ role: "user", content: user }]
  })
  const block = response.content[0]
  return block.type === "text" ? block.text : ""
}

async function callGoogle(apiKey: string, model: string, system: string, user: string) {
  const genAI = new GoogleGenerativeAI(apiKey)
  const gm = genAI.getGenerativeModel({
    model,
    systemInstruction: system
  })
  const result = await gm.generateContent(user)
  return result.response.text()
}

/**
 * Text-based scientific feedback pipeline adapted from
 * Weixin-Liang/LLM-scientific-feedback (no ScienceBeam PDF dependency).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FeedbackBody
    const { chatSettings, paper, provider: rawProvider } = body
    if (!paper || (!paper.abstract && !paper.mainContent && !paper.title)) {
      return NextResponse.json(
        { message: "Provide at least title, abstract, or main content." },
        { status: 400 }
      )
    }

    const profile = await getServerProfile()
    const provider = rawProvider || "openai"
    const skillPrompt = loadSkillSystemPrompt("scientific-feedback")
    const system = skillPrompt
      ? `${skillPrompt}\n\n${SCIENTIFIC_FEEDBACK_SYSTEM}`
      : SCIENTIFIC_FEEDBACK_SYSTEM
    const user = buildScientificFeedbackUserPrompt(paper)

    let review = ""

    if (provider === "anthropic") {
      checkApiKey(profile.anthropic_api_key, "Anthropic")
      review = await callAnthropic(
        profile.anthropic_api_key || "",
        chatSettings.model,
        system,
        user
      )
    } else if (provider === "google") {
      checkApiKey(profile.google_gemini_api_key, "Google")
      review = await callGoogle(
        profile.google_gemini_api_key || "",
        chatSettings.model,
        system,
        user
      )
    } else {
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
      const key = keyMap[provider] || profile.openai_api_key || ""
      checkApiKey(key, provider)
      review = await callOpenAICompatible(
        key,
        baseURLMap[provider],
        chatSettings.model,
        system,
        user
      )
    }

    return NextResponse.json({
      review,
      source: "LLM-scientific-feedback+Supervisor-Skills"
    })
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Scientific feedback failed" },
      { status: 500 }
    )
  }
}
