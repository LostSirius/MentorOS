import { NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * List models from OPENAI_API_BASE (/v1/models) when a proxy is configured.
 * Falls back to an empty list if unavailable — UI still shows the static catalog.
 */
export async function GET() {
  const base = process.env.OPENAI_API_BASE?.replace(/\/$/, "")
  const apiKey = process.env.OPENAI_API_KEY

  if (!base || !apiKey) {
    return NextResponse.json({ models: [], proxy: Boolean(base) })
  }

  try {
    const url = base.includes("/v1")
      ? `${base.replace(/\/$/, "")}/models`
      : `${base}/v1/models`

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      // Avoid caching stale proxy catalogs during development
      cache: "no-store"
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.warn(`Proxy models fetch failed (${res.status}): ${text}`)
      return NextResponse.json({ models: [], proxy: true, error: res.status })
    }

    const json = await res.json()
    const raw = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []

    const models = raw
      .map((item: any) => {
        const id = item?.id || item?.model || item?.name
        if (!id || typeof id !== "string") return null
        // Skip embeddings / audio / moderation when obvious
        const lower = id.toLowerCase()
        if (
          lower.includes("embed") ||
          lower.includes("whisper") ||
          lower.includes("tts") ||
          lower.includes("dall-e") ||
          lower.includes("moderation")
        ) {
          return null
        }
        return {
          id,
          name: item?.owned_by ? `${id} (${item.owned_by})` : id
        }
      })
      .filter(Boolean)

    return NextResponse.json({ models, proxy: true })
  } catch (error) {
    console.warn("Proxy models fetch error:", error)
    return NextResponse.json({ models: [], proxy: true, error: "fetch_failed" })
  }
}
