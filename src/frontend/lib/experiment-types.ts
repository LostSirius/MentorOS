/** Runtime Experiment types — aligned with docs/distill/schemas/handoff.ts */

export type ExperimentLocale = "en" | "zh"

export type EvidenceLevel = "L0" | "L1" | "L2" | "L3"

export type GateSeverity = "BLOCK" | "WARN" | "INFO" | "CLEAR"

export type GateResult = {
  id: string
  severity: GateSeverity
  message: string
  fixHint?: string
}

export type ExperimentStatus =
  | "draft"
  | "recipe_locked"
  | "results_attached"
  | "interpreted"

export type Baseline = {
  name: string
  why: string
  evidenceLevel?: EvidenceLevel
}

export type HypothesisOutcome = {
  hypothesis: string
  outcome: "support" | "reject" | "inconclusive"
  note: string
}

export type ClaimCheck = {
  claim: string
  verdict:
    | "ALIGNED"
    | "OVERSTATED"
    | "NOT_SUPPORTED"
    | "PROVENANCE_INSUFFICIENT"
}

export type ExperimentInterpretation = {
  hypothesisOutcomes: HypothesisOutcome[]
  claimChecks: ClaimCheck[]
  risks?: string[]
  summary?: string
}

export type ExperimentRecord = {
  version: 1
  ideaId?: string
  ideaTitle?: string
  status: ExperimentStatus
  hypotheses: string[]
  baselines: Baseline[]
  datasets: string[]
  metrics: string[]
  ablations: string[]
  robustnessChecks: string[]
  failureCriteria: string
  expectedArtifacts: string[]
  computePlan?: string
  checklist?: string[]
  runLogs?: string[]
  resultTables?: string[]
  interpretation?: ExperimentInterpretation
  locale: ExperimentLocale
  gates: GateResult[]
  createdAt: string
  updatedAt?: string
}

export function emptyExperiment(
  locale: ExperimentLocale = "en"
): ExperimentRecord {
  return {
    version: 1,
    status: "draft",
    hypotheses: [],
    baselines: [],
    datasets: [],
    metrics: [],
    ablations: [],
    robustnessChecks: [],
    failureCriteria: "",
    expectedArtifacts: [],
    locale,
    gates: [],
    createdAt: new Date().toISOString()
  }
}

export function hasAttachedResults(record: ExperimentRecord | null): boolean {
  if (!record) return false
  const logs = (record.runLogs || []).some(s => String(s).trim())
  const tables = (record.resultTables || []).some(s => String(s).trim())
  return logs || tables
}

export function canLockRecipe(record: ExperimentRecord | null): boolean {
  if (!record || record.status === "recipe_locked") return false
  if (record.status === "results_attached" || record.status === "interpreted")
    return false
  return (
    record.hypotheses.length > 0 &&
    record.baselines.length > 0 &&
    record.datasets.length > 0 &&
    record.metrics.length > 0 &&
    Boolean(record.failureCriteria?.trim())
  )
}

export function buildExperimentGates(record: ExperimentRecord): GateResult[] {
  const gates: GateResult[] = []
  const locale = record.locale

  if (!record.hypotheses.length) {
    gates.push({
      id: "missing-hypotheses",
      severity: "BLOCK",
      message:
        locale === "zh" ? "缺少可证伪假设" : "Missing falsifiable hypotheses"
    })
  }
  if (!record.baselines.length) {
    gates.push({
      id: "missing-baselines",
      severity: "BLOCK",
      message:
        locale === "zh"
          ? "缺少基线（须含强基线/SOTA 候选）"
          : "Missing baselines (include a strong/SOTA candidate)"
    })
  } else {
    const hasSotaHint = record.baselines.some(b =>
      /sota|strong|state[- ]of[- ]the[- ]art|强基线|当前最好/i.test(
        `${b.name} ${b.why}`
      )
    )
    if (!hasSotaHint) {
      gates.push({
        id: "weak-baseline-risk",
        severity: "WARN",
        message:
          locale === "zh"
            ? "未明确标注强基线/SOTA 候选（假基线风险）"
            : "No explicit strong/SOTA baseline marked (weak-baseline risk)",
        fixHint:
          locale === "zh"
            ? "在 baselines 中加入当年强基线并标注证据层级"
            : "Add a current strong baseline with evidence level"
      })
    }
  }
  if (!record.datasets.length) {
    gates.push({
      id: "missing-datasets",
      severity: "WARN",
      message: locale === "zh" ? "尚未指定数据集" : "Datasets not specified"
    })
  }
  if (!record.metrics.length) {
    gates.push({
      id: "missing-metrics",
      severity: "BLOCK",
      message:
        locale === "zh" ? "缺少主指标" : "Missing primary metrics",
      fixHint:
        locale === "zh"
          ? "在左侧「指标」中至少填写一项主指标（如 WER、Accuracy）"
          : "Add at least one primary metric in Metrics (e.g. WER, Accuracy)"
    })
  }
  if (!record.failureCriteria?.trim()) {
    gates.push({
      id: "missing-failure",
      severity: "WARN",
      message:
        locale === "zh"
          ? "缺少失败判据（何时判定假设失败）"
          : "Missing failure criteria"
    })
  }
  if (!record.robustnessChecks.length) {
    gates.push({
      id: "missing-robustness",
      severity: "INFO",
      message:
        locale === "zh"
          ? "建议补充稳健性检查"
          : "Consider adding robustness checks"
    })
  }

  // G5: no results → block numeric result narrative
  if (
    (record.status === "interpreted" || record.interpretation) &&
    !hasAttachedResults(record)
  ) {
    gates.push({
      id: "g5-no-results",
      severity: "BLOCK",
      message:
        locale === "zh"
          ? "无 runLog/resultTable 时禁止写数值结果叙事"
          : "No runLog/resultTable — numeric result narrative is forbidden",
      fixHint:
        locale === "zh"
          ? "粘贴真实日志或结果表后再解读"
          : "Attach real logs or result tables before interpreting"
    })
  }

  if (record.interpretation?.claimChecks?.some(c => c.verdict === "OVERSTATED")) {
    gates.push({
      id: "overstated-claims",
      severity: "WARN",
      message:
        locale === "zh"
          ? "存在夸大声称（OVERSTATED）"
          : "Overstated claim(s) detected"
    })
  }
  if (
    record.interpretation?.claimChecks?.some(
      c =>
        c.verdict === "NOT_SUPPORTED" ||
        c.verdict === "PROVENANCE_INSUFFICIENT"
    )
  ) {
    gates.push({
      id: "unsupported-claims",
      severity: "BLOCK",
      message:
        locale === "zh"
          ? "存在无证据或不充分出处的声称"
          : "Unsupported or provenance-insufficient claim(s)"
    })
  }

  if (gates.length === 0) {
    gates.push({
      id: "clear",
      severity: "CLEAR",
      message: locale === "zh" ? "门禁通过" : "Gates clear"
    })
  }
  return gates
}

export function experimentToMarkdown(record: ExperimentRecord): string {
  const lines: string[] = [
    `# Experiment Record`,
    ``,
    `- Status: ${record.status}`,
    `- Idea: ${record.ideaTitle || record.ideaId || "(none)"}`,
    `- Created: ${record.createdAt}`,
    ``,
    `## Hypotheses`,
    ...record.hypotheses.map((h, i) => `${i + 1}. ${h}`),
    ``,
    `## Baselines`,
    ...record.baselines.map(
      b =>
        `- **${b.name}** (${b.evidenceLevel || "L?"}): ${b.why}`
    ),
    ``,
    `## Datasets`,
    ...record.datasets.map(d => `- ${d}`),
    ``,
    `## Metrics`,
    ...record.metrics.map(m => `- ${m}`),
    ``,
    `## Ablations`,
    ...record.ablations.map(a => `- ${a}`),
    ``,
    `## Robustness`,
    ...record.robustnessChecks.map(r => `- ${r}`),
    ``,
    `## Failure criteria`,
    record.failureCriteria || "(none)",
    ``,
    `## Expected artifacts`,
    ...record.expectedArtifacts.map(a => `- ${a}`),
    ``,
    `## Compute plan`,
    record.computePlan || "(none)",
    ``
  ]
  if (hasAttachedResults(record)) {
    lines.push(`## Run logs`, ...(record.runLogs || []), ``)
    lines.push(`## Result tables`, ...(record.resultTables || []), ``)
  }
  if (record.interpretation) {
    lines.push(`## Interpretation`)
    for (const o of record.interpretation.hypothesisOutcomes || []) {
      lines.push(`- [${o.outcome}] ${o.hypothesis} — ${o.note}`)
    }
    lines.push(``)
    for (const c of record.interpretation.claimChecks || []) {
      lines.push(`- Claim: ${c.claim} → ${c.verdict}`)
    }
  }
  lines.push(``, `## Gates`)
  for (const g of record.gates || []) {
    lines.push(`- [${g.severity}] ${g.message}`)
  }
  return lines.join("\n")
}
