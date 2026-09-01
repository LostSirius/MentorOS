export type WritingLocale = "en" | "zh"

export function resolveWritingLocale(raw?: string | null): WritingLocale {
  const value = String(raw || "en").toLowerCase()
  return value.startsWith("zh") ? "zh" : "en"
}

export function writingLanguageInstruction(
  locale: WritingLocale,
  forceEnglish?: boolean
): string {
  if (forceEnglish || locale === "en") {
    return `Write all paper prose in clear academic English suitable for conference/journal submission. Preserve method/dataset names. HARD RULES: never invent citations, DOIs, or numeric results not present in the provided evidence. No placeholder brackets like [citation needed]. Evidence levels: L1 full text/logs, L2 abstract, L3 metadata only, L4 model memory banned.`
  }
  return `用简体中文撰写用户可见的写作辅导内容（大纲说明可中文）。若用户要求投稿英文章节，正文改用学术英文。硬规则：禁止编造引用/DOI/未提供的数值结果；禁止 [citation needed]、待补充 等占位符。证据层级 L1–L3 可用，L4 模型记忆禁止。`
}

export function writingModelHttpError(
  locale: WritingLocale,
  status: number
): string {
  return locale === "zh"
    ? `模型接口返回 HTTP ${status}`
    : `Model API returned HTTP ${status}`
}
