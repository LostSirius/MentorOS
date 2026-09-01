export type ExperimentLocale = "en" | "zh"

export function resolveExperimentLocale(raw?: string | null): ExperimentLocale {
  const value = String(raw || "en").toLowerCase()
  return value.startsWith("zh") ? "zh" : "en"
}

export function experimentLanguageInstruction(locale: ExperimentLocale): string {
  if (locale === "zh") {
    return `用简体中文撰写面向用户的实验配方与解读字段。保留方法名、数据集名、指标名的英文写法。硬规则：若用户未提供 runLog/resultTable，禁止编造任何数值结果或“准确率达到 X%”类表述，只能写计划中的测量。`
  }
  return `Write user-facing recipe and interpretation fields in clear academic English. Preserve method/dataset/metric names. HARD RULE: without user-provided run logs or result tables, NEVER invent numeric results or “we achieved X%”; only describe planned measurements.`
}

export function experimentModelHttpError(
  locale: ExperimentLocale,
  status: number
): string {
  return locale === "zh"
    ? `模型接口返回 HTTP ${status}`
    : `Model API returned HTTP ${status}`
}
