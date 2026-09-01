import { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"

export const runtime: ServerRuntime = "nodejs"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, apiKey: userApiKey } = json as {
    chatSettings: ChatSettings
    messages: any[]
    apiKey?: string
  }

  try {
    const envApiKey = process.env.SUPERVISOR_SKILLS_API_KEY || "sk-demo"
    const backendUrl = process.env.SUPERVISOR_SKILLS_BACKEND_URL || "http://localhost:6000"

    const supervisorSkills = new OpenAI({
      apiKey: envApiKey,
      baseURL: `${backendUrl}/v1`
    })

    const response = await supervisorSkills.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: messages as ChatCompletionCreateParamsBase["messages"],
      temperature: chatSettings.temperature,
      stream: true
    }, {
      headers: userApiKey ? { "X-API-Key": userApiKey } : undefined
    })

    const stream = OpenAIStream(response as any)

    return new StreamingTextResponse(stream)
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
