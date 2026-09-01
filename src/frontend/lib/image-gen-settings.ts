/** Dedicated image-generation API settings — separate from chat/LLM providers. */

import { migrateLocalStorageKey } from "@/lib/migrate-storage-keys"

export const IMAGE_GEN_STORAGE_KEY = "mentoros-image-gen-v1"

export type ImageGenSettings = {
  /** e.g. https://api.openai.com/v1 or a compatible gateway */
  baseUrl: string
  apiKey: string
  /** e.g. dall-e-3, gpt-image-1, flux-… */
  model: string
  /** OpenAI-style size string */
  size: string
}

export const DEFAULT_IMAGE_GEN_SETTINGS: ImageGenSettings = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "dall-e-3",
  size: "1024x1024"
}

export function loadImageGenSettings(): ImageGenSettings {
  if (typeof window === "undefined") return { ...DEFAULT_IMAGE_GEN_SETTINGS }
  try {
    migrateLocalStorageKey("scholar-canvas-image-gen-v1", IMAGE_GEN_STORAGE_KEY)
    const raw = localStorage.getItem(IMAGE_GEN_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_IMAGE_GEN_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<ImageGenSettings>
    return {
      baseUrl: String(parsed.baseUrl || DEFAULT_IMAGE_GEN_SETTINGS.baseUrl).trim(),
      apiKey: String(parsed.apiKey || "").trim(),
      model: String(parsed.model || DEFAULT_IMAGE_GEN_SETTINGS.model).trim(),
      size: String(parsed.size || DEFAULT_IMAGE_GEN_SETTINGS.size).trim()
    }
  } catch {
    return { ...DEFAULT_IMAGE_GEN_SETTINGS }
  }
}

export function saveImageGenSettings(settings: ImageGenSettings): void {
  if (typeof window === "undefined") return
  localStorage.setItem(
    IMAGE_GEN_STORAGE_KEY,
    JSON.stringify({
      baseUrl: settings.baseUrl.trim(),
      apiKey: settings.apiKey.trim(),
      model: settings.model.trim(),
      size: settings.size.trim()
    })
  )
}

export function isImageGenConfigured(settings: ImageGenSettings): boolean {
  return Boolean(
    settings.baseUrl.trim() &&
      settings.apiKey.trim() &&
      settings.model.trim()
  )
}

/** Normalize to …/v1 root without trailing slash. */
export function normalizeImageGenBaseUrl(raw: string): string {
  let u = String(raw || "").trim().replace(/\/+$/, "")
  if (!u) return DEFAULT_IMAGE_GEN_SETTINGS.baseUrl
  if (u.endsWith("/images/generations")) {
    u = u.replace(/\/images\/generations$/, "")
  }
  return u
}
