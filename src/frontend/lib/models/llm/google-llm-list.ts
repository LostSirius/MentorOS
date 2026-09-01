import { LLM } from "@/types"

const LINK = "https://ai.google.dev/gemini-api/docs/models"

function m(id: string, name: string): LLM {
  return {
    modelId: id,
    modelName: name,
    provider: "google",
    hostedId: id,
    platformLink: LINK,
    imageInput: true
  }
}

/** Catalog refreshed Aug 2026 from Google Gemini docs. */
export const GOOGLE_LLM_LIST: LLM[] = [
  m("gemini-flash-latest", "Gemini Flash (latest)"),
  m("gemini-pro-latest", "Gemini Pro (latest)"),
  m("gemini-3.6-flash", "Gemini 3.6 Flash"),
  m("gemini-3.5-flash", "Gemini 3.5 Flash"),
  m("gemini-3.1-flash-lite", "Gemini 3.1 Flash-Lite"),
  m("gemini-3.1-pro-preview", "Gemini 3.1 Pro Preview"),
  m("gemini-2.5-pro", "Gemini 2.5 Pro"),
  m("gemini-2.5-flash", "Gemini 2.5 Flash"),
  m("gemini-2.5-flash-lite", "Gemini 2.5 Flash-Lite"),
  m("gemini-2.0-flash", "Gemini 2.0 Flash"),
  m("gemini-2.0-flash-lite", "Gemini 2.0 Flash-Lite"),
  m("gemini-1.5-pro-latest", "Gemini 1.5 Pro"),
  m("gemini-1.5-flash", "Gemini 1.5 Flash")
]
