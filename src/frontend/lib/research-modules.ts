export type ResearchModuleId =
  | "overview"
  | "literature"
  | "idea"
  | "experiment"
  | "writing"
  | "polish"
  | "figures"
  | "review"

export type ResearchModuleMeta = {
  id: ResearchModuleId
  /** i18n key under research.modules.<id>.* */
  status: "ready" | "placeholder" | "coming"
}

/** Left-nav order. Overview is last to implement but shown as hub placeholder.
 *  Polish follows Review: draft → figures → peer review → revise/polish. */
export const RESEARCH_MODULES: ResearchModuleMeta[] = [
  { id: "overview", status: "ready" },
  { id: "literature", status: "ready" },
  { id: "idea", status: "ready" },
  { id: "experiment", status: "ready" },
  { id: "writing", status: "ready" },
  { id: "figures", status: "ready" },
  { id: "review", status: "ready" },
  { id: "polish", status: "ready" }
]

export const DEFAULT_RESEARCH_MODULE: ResearchModuleId = "literature"
