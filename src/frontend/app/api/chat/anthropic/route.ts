import { getChatSettingLimits } from "@/lib/chat-setting-limits"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { getBase64FromDataURL, getMediaTypeFromDataURL } from "@/lib/utils"
import { ChatSettings } from "@/types"
import Anthropic from "@anthropic-ai/sdk"
import { AnthropicStream, StreamingTextResponse } from "ai"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.anthropic_api_key, "Anthropic")

    let ANTHROPIC_FORMATTED_MESSAGES: any = messages.slice(1)

    ANTHROPIC_FORMATTED_MESSAGES = ANTHROPIC_FORMATTED_MESSAGES?.map(
      (message: any) => {
        const messageContent =
          typeof message?.content === "string"
            ? [message.content]
            : message?.content

        return {
          ...message,
          content: messageContent.map((content: any) => {
            if (typeof content === "string") {
              return { type: "text", text: content }
            } else if (
              content?.type === "image_url" &&
              content?.image_url?.url?.length
            ) {
              return {
                type: "image",
                source: {
                  type: "base64",
                  media_type: getMediaTypeFromDataURL(content.image_url.url),
                  data: getBase64FromDataURL(content.image_url.url)
                }
              }
            } else {
              return content
            }
          })
        }
      }
    )

    const anthropic = new Anthropic({
      apiKey: profile.anthropic_api_key || "",
      ...(process.env.ANTHROPIC_BASE_URL
        ? { baseURL: process.env.ANTHROPIC_BASE_URL }
        : {})
    })

    // Prefer the user's selected model so the catalog is meaningful.
    // Fall back to ANTHROPIC_MODEL only when nothing is selected.
    const model = chatSettings.model || process.env.ANTHROPIC_MODEL || ""

    const limits = getChatSettingLimits(chatSettings.model)

    try {
      const response = await anthropic.messages.create({
        model,
        messages: ANTHROPIC_FORMATTED_MESSAGES,
        temperature: chatSettings.temperature,
        system: messages[0].content,
        max_tokens: limits.MAX_TOKEN_OUTPUT_LENGTH,
        stream: true
      })

      try {
        const stream = AnthropicStream(response)
        return new StreamingTextResponse(stream)
      } catch (error: any) {
        console.error("Error parsing Anthropic API response:", error)
        return new NextResponse(
          JSON.stringify({
            message:
              "An error occurred while parsing the Anthropic API response"
          }),
          { status: 500 }
        )
      }
    } catch (error: any) {
      console.error("Error calling Anthropic API:", error)
      return new NextResponse(
        JSON.stringify({
          message:
            error?.message || "An error occurred while calling the Anthropic API"
        }),
        { status: 500 }
      )
    }
  } catch (error: any) {
    const errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
