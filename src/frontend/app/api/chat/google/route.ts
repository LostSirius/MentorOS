import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { GoogleGenerativeAI } from "@google/generative-ai"

export const runtime = "nodejs"

type GeminiPart = { text?: string; inlineData?: { data: string; mimeType: string } }

function toParts(message: any): GeminiPart[] {
  // Already Gemini-shaped: { role, parts }
  if (Array.isArray(message?.parts)) {
    return message.parts
  }

  const content = message?.content
  if (typeof content === "string") {
    return content ? [{ text: content }] : []
  }

  if (!Array.isArray(content)) {
    return []
  }

  return content
    .map((part: any) => {
      if (typeof part === "string") return { text: part }
      if (part?.type === "text" || part?.text) {
        return { text: part.text || "" }
      }
      if (part?.inlineData) return { inlineData: part.inlineData }
      if (part?.type === "image_url" && part?.image_url?.url) {
        const url: string = part.image_url.url
        const match = url.match(/^data:([^;]+);base64,(.+)$/)
        if (match) {
          return { inlineData: { mimeType: match[1], data: match[2] } }
        }
      }
      return null
    })
    .filter(Boolean) as GeminiPart[]
}

/**
 * Gemini rejects role "system" in chat history and requires the first
 * history turn to be "user". System prompts go into systemInstruction.
 */
function prepareGeminiChat(messages: any[]) {
  const systemTexts: string[] = []
  const turns: { role: "user" | "model"; parts: GeminiPart[] }[] = []

  for (const message of messages || []) {
    const roleRaw = message?.role
    const parts = toParts(message)
    if (!parts.length) continue

    if (roleRaw === "system") {
      const text = parts
        .map(p => p.text)
        .filter(Boolean)
        .join("\n")
      if (text) systemTexts.push(text)
      continue
    }

    const role: "user" | "model" =
      roleRaw === "assistant" || roleRaw === "model" ? "model" : "user"

    // Merge consecutive same-role turns (Gemini expects alternation)
    const last = turns[turns.length - 1]
    if (last && last.role === role) {
      last.parts.push(...parts)
    } else {
      turns.push({ role, parts })
    }
  }

  if (!turns.length) {
    throw new Error("No user/model messages to send to Gemini")
  }

  // Drop leading model turns so history (if any) starts with user
  while (turns.length > 1 && turns[0].role !== "user") {
    turns.shift()
  }

  const last = turns[turns.length - 1]
  const history = turns.slice(0, -1).filter(t => t.role === "user" || t.role === "model")

  // Ensure history starts with user
  while (history.length && history[0].role !== "user") {
    history.shift()
  }

  return {
    systemInstruction: systemTexts.length ? systemTexts.join("\n\n") : undefined,
    history,
    lastParts: last.parts
  }
}

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.google_gemini_api_key, "Google")

    const { systemInstruction, history, lastParts } =
      prepareGeminiChat(messages)

    const genAI = new GoogleGenerativeAI(profile.google_gemini_api_key || "")
    const googleModel = genAI.getGenerativeModel({
      model: chatSettings.model,
      ...(systemInstruction ? { systemInstruction } : {})
    })

    const chat = googleModel.startChat({
      history: history as any,
      generationConfig: {
        temperature: chatSettings.temperature
      }
    })

    const response = await chat.sendMessageStream(lastParts as any)

    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response.stream) {
            const chunkText = chunk.text()
            controller.enqueue(encoder.encode(chunkText))
          }
          controller.close()
        } catch (err: any) {
          controller.error(err)
        }
      }
    })

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain" }
    })
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Google Gemini API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("api key not valid")) {
      errorMessage =
        "Google Gemini API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
