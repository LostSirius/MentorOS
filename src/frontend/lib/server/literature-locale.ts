/** Server-side locale helpers for literature review synthesis. */

export type LiteratureLocale = "en" | "zh"

export function resolveLiteratureLocale(raw?: string | null): LiteratureLocale {
  const value = String(raw || "en").toLowerCase()
  return value.startsWith("zh") ? "zh" : "en"
}

export function notInAbstract(locale: LiteratureLocale): string {
  return locale === "zh"
    ? "未在检索摘要中说明"
    : "Not specified in the retrieved abstract"
}

export function literatureSurveyTitle(
  locale: LiteratureLocale,
  topic: string
): string {
  return locale === "zh" ? `文献综述：${topic}` : `Literature survey: ${topic}`
}

export function modelHttpError(locale: LiteratureLocale, status: number): string {
  return locale === "zh"
    ? `模型接口返回 HTTP ${status}`
    : `Model API returned HTTP ${status}`
}

export function noPapersMessage(locale: LiteratureLocale): string {
  return locale === "zh"
    ? "未检索到相关论文。请换用更具体的中英文关键词，或检查网络是否可访问学术公开 API。"
    : "No relevant papers found. Try more specific keywords, or check network access to public scholarly APIs."
}

export function synthesisIssueEmpty(locale: LiteratureLocale): string {
  return locale === "zh" ? "模型返回内容为空" : "Model returned empty content"
}

export function synthesisIssueBadMeta(locale: LiteratureLocale): string {
  return locale === "zh"
    ? "模型返回了不属于检索证据的论文元数据，已丢弃模型元数据"
    : "Model returned paper metadata outside retrieved evidence; discarded model metadata"
}

export function synthesisIssueBadJson(
  locale: LiteratureLocale,
  detail: string
): string {
  return locale === "zh"
    ? `模型返回内容不是有效 JSON：${detail}`
    : `Model response was not valid JSON: ${detail}`
}

export function synthesisIssueCallFailed(
  locale: LiteratureLocale,
  detail: string
): string {
  return locale === "zh"
    ? `模型调用失败：${detail}`
    : `Model call failed: ${detail}`
}

export function synthesisIssueUnparsed(locale: LiteratureLocale): string {
  return locale === "zh"
    ? "模型未返回可解析结构"
    : "Model did not return a parseable structure"
}

export function languageInstruction(locale: LiteratureLocale): string {
  if (locale === "zh") {
    return `Write the user-facing content in Simplified Chinese, while preserving professional terms, paper titles, model names, dataset names, and method names in English when appropriate. When the user topic is Chinese, still ground claims in the (mostly English) evidence abstracts and map concepts back to the Chinese domain labels above. If a dataset or result is not present in the abstract, write "未在检索摘要中说明".`
  }
  return `Write ALL user-facing narrative fields in clear academic English (abstract, briefs, lineage, sections, gaps, future directions, timeline contributions, poster text). Preserve paper titles, model names, datasets, and method names as in the evidence. If a dataset or result is not present in the abstract, write "Not specified in the retrieved abstract".`
}

export function lineageNarrativeHint(locale: LiteratureLocale): string {
  return locale === "zh"
    ? "200-350 Chinese characters describing how the field evolved across these papers, with citations; mention bilingual domain framing when useful"
    : "150-250 words describing how the field evolved across these papers, with citations; mention domain framing when useful"
}

export function threadNameHint(locale: LiteratureLocale): string {
  return locale === "zh"
    ? "research thread name (Chinese ok, keep key English terms)"
    : "research thread name in English (keep key technical terms)"
}
