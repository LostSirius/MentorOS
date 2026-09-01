import {
  isImageGenConfigured,
  normalizeImageGenBaseUrl,
  type ImageGenSettings
} from "@/lib/image-gen-settings"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

interface ImageGenRequest {
  prompt: string
  /** Dedicated image API — never reuse chat provider keys from the server env by default */
  imageGen: ImageGenSettings
  locale?: string
}

/**
 * Dedicated figure image generation.
 * Uses ONLY the user-supplied imageGen credentials — not the chat panel model.
 */
export async function POST(request: NextRequest) {
  try {
    const json = (await request.json()) as ImageGenRequest
    const locale = String(json.locale || "")
      .toLowerCase()
      .startsWith("zh")
      ? "zh"
      : "en"

    const prompt = String(json.prompt || "").trim()
    if (prompt.length < 8) {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? "生图提示词过短，请先填写主张或提示词"
              : "Image prompt is too short — add a claim or prompt first"
        },
        { status: 400 }
      )
    }

    const imageGen = {
      baseUrl: normalizeImageGenBaseUrl(json.imageGen?.baseUrl || ""),
      apiKey: String(json.imageGen?.apiKey || "").trim(),
      model: String(json.imageGen?.model || "").trim(),
      size: String(json.imageGen?.size || "1024x1024").trim()
    }

    if (!isImageGenConfigured(imageGen)) {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? "请先配置专用生图 API（Base URL、API Key、模型）。对话里的模型不会用于生图。"
              : "Configure a dedicated image API (Base URL, API Key, model). The chat model is not used for image generation."
        },
        { status: 400 }
      )
    }

    const endpoint = `${imageGen.baseUrl}/images/generations`
    const body: Record<string, unknown> = {
      model: imageGen.model,
      prompt: prompt.slice(0, 3500),
      n: 1,
      size: imageGen.size || "1024x1024"
    }
    // Prefer b64 for archival; many gateways also accept response_format
    body.response_format = "b64_json"

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${imageGen.apiKey}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000)
    })

    const rawText = await res.text()
    if (!res.ok) {
      let detail = rawText.slice(0, 400)
      try {
        const errJson = JSON.parse(rawText) as {
          error?: { message?: string }
          message?: string
        }
        detail = errJson.error?.message || errJson.message || detail
      } catch {
        /* keep */
      }
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? `生图 API 失败（HTTP ${res.status}）：${detail}`
              : `Image API failed (HTTP ${res.status}): ${detail}`
        },
        { status: 502 }
      )
    }

    let parsed: {
      data?: { b64_json?: string; url?: string }[]
    } = {}
    try {
      parsed = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? "生图 API 返回了无法解析的响应"
              : "Image API returned an unparseable response"
        },
        { status: 502 }
      )
    }

    const first = parsed.data?.[0]
    if (!first) {
      return NextResponse.json(
        {
          message:
            locale === "zh"
              ? "生图 API 未返回图片数据"
              : "Image API returned no image data"
        },
        { status: 502 }
      )
    }

    if (first.b64_json) {
      const mime = "image/png"
      return NextResponse.json({
        imageUrl: `data:${mime};base64,${first.b64_json}`,
        imageMime: mime,
        source: "b64"
      })
    }

    if (first.url) {
      return NextResponse.json({
        imageUrl: first.url,
        imageMime: "image/*",
        source: "url"
      })
    }

    return NextResponse.json(
      {
        message:
          locale === "zh"
            ? "生图 API 响应中既无 b64 也无 url"
            : "Image API response had neither b64 nor url"
      },
      { status: 502 }
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Image generation failed"
    return NextResponse.json({ message }, { status: 500 })
  }
}
