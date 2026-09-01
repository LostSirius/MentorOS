export type IdeaLocale = "en" | "zh"

export function resolveIdeaLocale(raw?: string | null): IdeaLocale {
  const value = String(raw || "en").toLowerCase()
  return value.startsWith("zh") ? "zh" : "en"
}

export function ideaLanguageInstruction(locale: IdeaLocale): string {
  if (locale === "zh") {
    return `用简体中文撰写面向用户的叙述字段（标题、一句话故事、理由、缺陷说明、能力匹配、会场建议、修订建议、研究问题与假设）。保留专业术语、方法名、数据集名的英文写法。禁止编造用户未提供的实验结果。`
  }
  return `Write all user-facing narrative fields in clear academic English (titles, one-liners, rationales, flaw details, capability fit, venue suggestion, revision advice, research questions, hypotheses). Never claim experimental proof the user did not provide.`
}

export function ideaModelHttpError(locale: IdeaLocale, status: number): string {
  return locale === "zh"
    ? `模型接口返回 HTTP ${status}`
    : `Model API returned HTTP ${status}`
}
