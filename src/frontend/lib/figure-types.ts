/** Runtime Figures types — aligned with docs/distill/schemas/handoff.ts */

export type FigureLocale = "en" | "zh"

export type GateSeverity = "BLOCK" | "WARN" | "INFO" | "CLEAR"

export type GateResult = {
  id: string
  severity: GateSeverity
  message: string
  fixHint?: string
}

export type FigureType =
  | "motivated_example"
  | "solution_overview"
  | "experimental_results"

export const FIGURE_TYPES: FigureType[] = [
  "motivated_example",
  "solution_overview",
  "experimental_results"
]

/** QC checklist keys from distill/modules/figures.md */
export const FIGURE_QC_KEYS = [
  "vectorExport",
  "minFont8pt",
  "colorBlindSafe",
  "colorCountLe6",
  "captionFindingFirst",
  "axesNamed",
  "panelLetters",
  "statsAnnotated"
] as const

export type FigureQcKey = (typeof FIGURE_QC_KEYS)[number]

/** What the module should produce for the user */
export type FigureDeliverable =
  | "design"
  | "render"
  | "code"
  | "prompt"
  | "ai_image"

export const FIGURE_DELIVERABLES: FigureDeliverable[] = [
  "design",
  "render",
  "code",
  "prompt",
  "ai_image"
]

export type FigureChartKind = "bar" | "line" | "area" | "scatter"

export type FigureChartSeries = {
  key: string
  label?: string
  color?: string
}

/** Client-renderable chart from user-provided numbers only */
export type FigureChartSpec = {
  chartType: FigureChartKind
  title?: string
  xKey: string
  xLabel?: string
  yLabel?: string
  series: FigureChartSeries[]
  rows: Record<string, string | number>[]
}

export type FigureSpec = {
  version: 1
  id: string
  type: FigureType
  claim: string
  layoutNotes: string
  paradigm?: string
  tool?: string
  captionDraft?: string
  panelPlan?: string
  paletteNotes?: string
  /** Preferred output: design notes / live chart / code / gen prompt */
  deliverable?: FigureDeliverable
  /** Raw table / CSV / JSON the user supplied for render */
  dataPayload?: string
  chartSpec?: FigureChartSpec | null
  /** Matplotlib / seaborn / plotly / draw.io XML snippet */
  codeArtifact?: string
  codeLanguage?: string
  /** Image-gen or reconstruction prompt */
  promptArtifact?: string
  /** AI-rendered image: http(s) URL, or IndexedDB ref `idb:figure-img:…` (not raw data URLs in archives) */
  imageUrl?: string
  imageMime?: string
  qc: Record<FigureQcKey, boolean>
  locale: FigureLocale
  gates: GateResult[]
  createdAt: string
}

export type FigureSession = {
  version: 1
  figures: FigureSpec[]
  activeId: string | null
}

export function emptyQc(): Record<FigureQcKey, boolean> {
  return {
    vectorExport: false,
    minFont8pt: false,
    colorBlindSafe: false,
    colorCountLe6: false,
    captionFindingFirst: false,
    axesNamed: false,
    panelLetters: false,
    statsAnnotated: false
  }
}

export function normalizeQc(
  raw: unknown
): Record<FigureQcKey, boolean> {
  const base = emptyQc()
  if (!raw || typeof raw !== "object") return base
  const obj = raw as Record<string, unknown>
  for (const key of FIGURE_QC_KEYS) {
    if (typeof obj[key] === "boolean") base[key] = obj[key]
  }
  // Accept alternate snake keys from models
  const aliases: Record<string, FigureQcKey> = {
    vector_export: "vectorExport",
    min_font_8pt: "minFont8pt",
    color_blind_safe: "colorBlindSafe",
    color_count_le6: "colorCountLe6",
    caption_finding_first: "captionFindingFirst",
    axes_named: "axesNamed",
    panel_letters: "panelLetters",
    stats_annotated: "statsAnnotated"
  }
  for (const [k, v] of Object.entries(obj)) {
    const mapped = aliases[k]
    if (mapped && typeof v === "boolean") base[mapped] = v
  }
  return base
}

export function qcPassedCount(qc: Record<FigureQcKey, boolean>): number {
  return FIGURE_QC_KEYS.filter(k => qc[k]).length
}

export function qcComplete(qc: Record<FigureQcKey, boolean>): boolean {
  return FIGURE_QC_KEYS.every(k => qc[k])
}

export function emptyFigureSession(): FigureSession {
  return { version: 1, figures: [], activeId: null }
}

export function newFigureId(): string {
  return `fig_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function emptyFigureSpec(
  locale: FigureLocale = "en",
  partial?: Partial<FigureSpec>,
  opts?: { hasExperimentResults?: boolean }
): FigureSpec {
  const claim = partial?.claim ?? ""
  const type = partial?.type || "motivated_example"
  const qc = partial?.qc ? normalizeQc(partial.qc) : emptyQc()
  const base: Omit<FigureSpec, "gates"> = {
    version: 1,
    id: partial?.id || newFigureId(),
    type,
    claim,
    layoutNotes: partial?.layoutNotes ?? "",
    paradigm: partial?.paradigm,
    tool: partial?.tool,
    captionDraft: partial?.captionDraft,
    panelPlan: partial?.panelPlan,
    paletteNotes: partial?.paletteNotes,
    deliverable: partial?.deliverable || "design",
    dataPayload: partial?.dataPayload,
    chartSpec: partial?.chartSpec ?? null,
    codeArtifact: partial?.codeArtifact,
    codeLanguage: partial?.codeLanguage,
    promptArtifact: partial?.promptArtifact,
    imageUrl: partial?.imageUrl,
    imageMime: partial?.imageMime,
    qc,
    locale: partial?.locale || locale,
    createdAt: partial?.createdAt || new Date().toISOString()
  }
  return {
    ...base,
    gates: buildFigureGates(base, opts)
  }
}

export function buildFigureGates(
  spec: Omit<FigureSpec, "gates"> & { gates?: GateResult[] },
  opts?: { hasExperimentResults?: boolean }
): GateResult[] {
  const gates: GateResult[] = []
  const zh = spec.locale === "zh"
  const claim = (spec.claim || "").trim()

  if (!claim) {
    gates.push({
      id: "no-claim",
      severity: "BLOCK",
      message: zh
        ? "未填写本图要证明的 claim — 禁止生成装饰图"
        : "No claim provided — refuse decorative figures",
      fixHint: zh
        ? "用一句话写清这张图必须证明什么"
        : "State in one sentence what this figure must prove"
    })
  }

  if (
    spec.deliverable === "ai_image" &&
    !(spec.imageUrl || "").trim()
  ) {
    gates.push({
      id: "ai-image-pending",
      severity: "INFO",
      message: zh
        ? "AI 生图需配置专用生图 API（与对话模型分离）"
        : "AI image render needs a dedicated image API (separate from chat)",
      fixHint: zh
        ? "在下方填写生图 Base URL / API Key / 模型后再生成"
        : "Fill image Base URL / API Key / model below, then generate"
    })
  }

  if (
    spec.deliverable === "render" &&
    !(spec.dataPayload || "").trim() &&
    !(spec.chartSpec?.rows?.length)
  ) {
    gates.push({
      id: "render-need-data",
      severity: "WARN",
      message: zh
        ? "「渲染出图」需要粘贴表格数据（CSV / JSON）"
        : "Render mode needs pasted table data (CSV / JSON)",
      fixHint: zh
        ? "粘贴结果表后再生成，或改选代码/提示词产出"
        : "Paste a results table, or switch to code/prompt deliverable"
    })
  }

  if (
    spec.type === "experimental_results" &&
    !opts?.hasExperimentResults &&
    /accuracy|F1|AUC|%\s*(gain|improve)|提升了|准确率/i.test(
      `${spec.claim} ${spec.layoutNotes} ${spec.captionDraft || ""}`
    )
  ) {
    gates.push({
      id: "g2-invented-numbers",
      severity: "WARN",
      message: zh
        ? "结果图叙述含数字/指标，但尚无实验 provenance"
        : "Results figure mentions metrics without experiment provenance",
      fixHint: zh
        ? "先在实验模块粘贴结果，或从图注中去掉未证实数字"
        : "Attach results in Experiment, or remove unverified numbers from the caption"
    })
  }

  const passed = qcPassedCount(spec.qc)
  if (claim && passed < FIGURE_QC_KEYS.length) {
    gates.push({
      id: "qc-incomplete",
      severity: passed === 0 ? "INFO" : "WARN",
      message: zh
        ? `图 QC 未齐（${passed}/${FIGURE_QC_KEYS.length}）— 不可标 camera-ready`
        : `Figure QC incomplete (${passed}/${FIGURE_QC_KEYS.length}) — not camera-ready`,
      fixHint: zh
        ? "逐项勾选 QC；全部通过后才可定稿图"
        : "Tick each QC item; all must pass for camera-ready"
    })
  }

  if (claim && qcComplete(spec.qc)) {
    gates.push({
      id: "qc-clear",
      severity: "CLEAR",
      message: zh ? "图 QC 全部通过" : "Figure QC complete"
    })
  }

  if (gates.length === 0) {
    gates.push({
      id: "clear",
      severity: "CLEAR",
      message: zh ? "门禁通过" : "Gates clear"
    })
  }

  return gates
}

export function figureToMarkdown(spec: FigureSpec): string {
  const lines = [
    `# Figure · ${spec.type}`,
    "",
    `- Claim: ${spec.claim || "(none)"}`,
    `- Paradigm: ${spec.paradigm || "(n/a)"}`,
    `- Tool: ${spec.tool || "(n/a)"}`,
    `- Locale: ${spec.locale}`,
    `- Created: ${spec.createdAt}`,
    "",
    "## Layout",
    "",
    spec.layoutNotes || "(empty)",
    ""
  ]
  if (spec.panelPlan) {
    lines.push("## Panels", "", spec.panelPlan, "")
  }
  if (spec.paletteNotes) {
    lines.push("## Palette", "", spec.paletteNotes, "")
  }
  if (spec.captionDraft) {
    lines.push("## Caption draft", "", spec.captionDraft, "")
  }
  if (spec.deliverable) {
    lines.splice(5, 0, `- Deliverable: ${spec.deliverable}`)
  }
  if (spec.codeArtifact) {
    lines.push(
      "## Code",
      "",
      "```" + (spec.codeLanguage || "python"),
      spec.codeArtifact,
      "```",
      ""
    )
  }
  if (spec.promptArtifact) {
    lines.push("## Prompt", "", spec.promptArtifact, "")
  }
  if (spec.imageUrl) {
    lines.push(
      "## AI image",
      "",
      spec.imageUrl.startsWith("data:")
        ? "(embedded data URL — open in UI)"
        : spec.imageUrl.startsWith("idb:figure-img:")
          ? "(stored in local IndexedDB — open in UI)"
          : spec.imageUrl,
      ""
    )
  }
  if (spec.chartSpec?.rows?.length) {
    lines.push(
      "## Chart spec",
      "",
      "```json",
      JSON.stringify(spec.chartSpec, null, 2),
      "```",
      ""
    )
  }
  lines.push("## QC", "")
  for (const key of FIGURE_QC_KEYS) {
    lines.push(`- [${spec.qc[key] ? "x" : " "}] ${key}`)
  }
  lines.push("", "## Gates", "")
  for (const g of spec.gates) {
    lines.push(`- **${g.severity}** ${g.message}`)
  }
  return lines.join("\n")
}

export function figuresSessionToMarkdown(session: FigureSession): string {
  const parts = [
    `# Figures · ${session.figures.length} spec(s)`,
    "",
    `- Active: ${session.activeId || "(none)"}`,
    ""
  ]
  if (!session.figures.length) {
    parts.push("_No figure specs yet._", "")
    return parts.join("\n")
  }
  for (const fig of session.figures) {
    parts.push("---", "", figureToMarkdown(fig), "")
  }
  return parts.join("\n")
}

export function isFigureSession(value: unknown): value is FigureSession {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as FigureSession).version === 1 &&
      Array.isArray((value as FigureSession).figures)
  )
}

export function isFigureSpec(value: unknown): value is FigureSpec {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as FigureSpec).version === 1 &&
      typeof (value as FigureSpec).claim === "string" &&
      typeof (value as FigureSpec).type === "string"
  )
}

/** Accept FigureSession, single FigureSpec, or figures[] from archives. */
export function normalizeFigureSession(raw: unknown): FigureSession {
  if (!raw) return emptyFigureSession()
  if (isFigureSession(raw)) {
    const figures = raw.figures
      .filter(isFigureSpec)
      .map(f => emptyFigureSpec(f.locale || "en", f))
    return {
      version: 1,
      figures,
      activeId:
        raw.activeId && figures.some(f => f.id === raw.activeId)
          ? raw.activeId
          : figures[0]?.id || null
    }
  }
  if (isFigureSpec(raw)) {
    const fig = emptyFigureSpec(raw.locale || "en", raw)
    return { version: 1, figures: [fig], activeId: fig.id }
  }
  if (Array.isArray(raw)) {
    const figures = raw
      .filter(isFigureSpec)
      .map(f => emptyFigureSpec(f.locale || "en", f))
    return {
      version: 1,
      figures,
      activeId: figures[0]?.id || null
    }
  }
  return emptyFigureSession()
}

export function upsertFigure(
  session: FigureSession,
  spec: FigureSpec
): FigureSession {
  const idx = session.figures.findIndex(f => f.id === spec.id)
  const figures =
    idx >= 0
      ? session.figures.map((f, i) => (i === idx ? spec : f))
      : [spec, ...session.figures]
  return { version: 1, figures, activeId: spec.id }
}

export function normalizeChartSpec(raw: unknown): FigureChartSpec | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const chartType = String(o.chartType || o.type || "bar")
  const kind: FigureChartKind =
    chartType === "line" ||
    chartType === "area" ||
    chartType === "scatter" ||
    chartType === "bar"
      ? chartType
      : "bar"
  const xKey = String(o.xKey || o.x || "x").trim() || "x"
  const seriesRaw = Array.isArray(o.series) ? o.series : []
  const series: FigureChartSeries[] = seriesRaw
    .map((s, i) => {
      if (typeof s === "string") return { key: s, label: s }
      if (s && typeof s === "object") {
        const row = s as Record<string, unknown>
        const key = String(row.key || row.name || `y${i + 1}`)
        return {
          key,
          label: String(row.label || key),
          color: row.color ? String(row.color) : undefined
        }
      }
      return null
    })
    .filter(Boolean) as FigureChartSeries[]
  const rowsRaw = Array.isArray(o.rows)
    ? o.rows
    : Array.isArray(o.data)
      ? o.data
      : []
  const rows = rowsRaw
    .filter(r => r && typeof r === "object")
    .map(r => {
      const out: Record<string, string | number> = {}
      for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
        if (typeof v === "number" && Number.isFinite(v)) out[k] = v
        else if (typeof v === "string") {
          const n = Number(v)
          out[k] = v.trim() !== "" && Number.isFinite(n) && /^-?\d/.test(v)
            ? n
            : v
        }
      }
      return out
    })
    .filter(r => Object.keys(r).length > 0)
  if (!rows.length || !series.length) return null
  return {
    chartType: kind,
    title: o.title ? String(o.title) : undefined,
    xKey,
    xLabel: o.xLabel ? String(o.xLabel) : undefined,
    yLabel: o.yLabel ? String(o.yLabel) : undefined,
    series,
    rows: rows.slice(0, 200)
  }
}

/** Best-effort CSV → rows for seeding chart / prompt context */
export function parseTablePreview(
  raw: string,
  maxRows = 40
): Record<string, string>[] {
  const text = String(raw || "").trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed
        .filter(r => r && typeof r === "object")
        .slice(0, maxRows)
        .map(r => {
          const out: Record<string, string> = {}
          for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
            out[k] = String(v ?? "")
          }
          return out
        })
    }
  } catch {
    /* CSV path */
  }
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const split = (line: string) => {
    if (line.includes("\t")) return line.split("\t")
    return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c =>
      c.replace(/^"|"$/g, "").trim()
    )
  }
  const headers = split(lines[0]).map((h, i) => h || `col${i + 1}`)
  return lines.slice(1, maxRows + 1).map(line => {
    const cells = split(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? ""
    })
    return row
  })
}
