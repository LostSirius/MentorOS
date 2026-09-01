import fs from "fs"
import path from "path"
import { skillIdForCanvasMode } from "@/lib/research-workflow"

function skillsRoot(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "..", "backend", "plugins", "phd-research", "skills"),
    path.resolve(process.cwd(), "..", "plugins", "phd-research", "skills"),
    path.resolve(process.cwd(), "plugins", "phd-research", "skills"),
    path.resolve(process.cwd(), "public", "plugins", "phd-research", "skills")
  ]
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir
  }
  return null
}

function loadReferences(skillId: string, maxChars = 18000): string {
  const root = skillsRoot()
  if (!root) return ""
  const refsDir = path.join(root, skillId, "references")
  if (!fs.existsSync(refsDir)) return ""

  const files = fs
    .readdirSync(refsDir)
    .filter(f => f.endsWith(".md"))
    .sort()

  const chunks: string[] = []
  let total = 0
  for (const file of files) {
    try {
      const text = fs.readFileSync(path.join(refsDir, file), "utf-8")
      const header = `### ${file}\n`
      const room = maxChars - total - header.length
      if (room <= 200) break
      if (text.length > room) {
        chunks.push(header + text.slice(0, room) + "\n…")
        break
      }
      chunks.push(header + text)
      total += header.length + text.length
    } catch {
      /* skip */
    }
  }
  return chunks.join("\n\n")
}

/**
 * Server-side silent load of SKILL.md content (no network, no UI).
 */
export function loadSkillMarkdown(skillId: string): string {
  if (!skillId) return ""
  const root = skillsRoot()
  if (!root) return ""
  const file = path.join(root, skillId, "SKILL.md")
  try {
    return fs.readFileSync(file, "utf-8")
  } catch {
    return ""
  }
}

export function loadSkillSystemPrompt(skillId: string): string {
  const content = loadSkillMarkdown(skillId)
  if (!content) return ""
  const refs = loadReferences(skillId)
  const refsBlock = refs
    ? `\n\n--- REFERENCE MATERIALS ---\n\n${refs}\n\n--- END REFERENCES ---\n`
    : ""

  return (
    "You are an AI research co-advisor for the full research lifecycle. " +
    "Follow the procedure below precisely. Do not mention skill names or files.\n\n" +
    "--- RESEARCH PROCEDURE ---\n\n" +
    content +
    "\n\n--- END RESEARCH PROCEDURE ---" +
    refsBlock +
    "\n\nExecute the procedure based on the user's request."
  )
}

/** Compose primary + optional support procedures for richer module behavior. */
export function loadComposedSkillPrompt(
  primarySkillId: string,
  supportSkillIds: string[] = []
): string {
  const primary = loadSkillSystemPrompt(primarySkillId)
  if (!primary) return ""
  const extras = supportSkillIds
    .filter(id => id && id !== primarySkillId)
    .map(id => {
      const md = loadSkillMarkdown(id)
      return md
        ? `\n\n--- SUPPLEMENTARY PROCEDURE (${id}) ---\n\n${md}\n\n--- END SUPPLEMENTARY ---`
        : ""
    })
    .join("")
  // Strip internal ids from user-visible behavior by instructing silence
  return (
    primary +
    extras +
    "\n\nNever name internal procedure identifiers in your reply."
  )
}

export function loadSkillForMode(mode: string): string {
  const skillId = skillIdForCanvasMode(mode)
  if (mode === "drafting") {
    return loadComposedSkillPrompt("intro-drafter", ["scientific-feedback"])
  }
  if (mode === "literature-review") {
    return loadComposedSkillPrompt("literature-review", ["deep-research"])
  }
  if (mode === "evaluator") {
    return loadSkillSystemPrompt("idea-evaluator")
  }
  if (mode === "brainstorm") {
    return loadSkillSystemPrompt("brainstorm")
  }
  if (mode === "benchmark" || mode === "experiment") {
    return loadComposedSkillPrompt("benchmark-paper-template", [
      "tech-paper-template"
    ])
  }
  if (mode === "outline" || mode === "structure") {
    return loadComposedSkillPrompt("tech-paper-template", ["paper-writer"])
  }
  if (mode === "draft_section" || mode === "write" || mode === "nature_style") {
    return loadComposedSkillPrompt("paper-writer", ["scientific-feedback"])
  }
  if (mode === "intro" || mode === "drafting") {
    return loadComposedSkillPrompt("intro-drafter", ["scientific-feedback"])
  }
  if (mode === "polish" || mode === "revise_feedback" || mode === "revise_scoped") {
    return loadComposedSkillPrompt("paper-polish", ["scientific-feedback"])
  }
  if (
    mode === "figures" ||
    mode === "figure" ||
    mode === "motivated_example" ||
    mode === "solution_overview" ||
    mode === "experimental_results" ||
    mode === "design" ||
    mode === "audit"
  ) {
    return loadComposedSkillPrompt("figure-designer", ["drawio-reconstruction"])
  }
  if (
    mode === "review" ||
    mode === "full" ||
    mode === "checklist" ||
    mode === "perspectives" ||
    mode === "response" ||
    mode === "pre-submission"
  ) {
    return loadComposedSkillPrompt("pre-submission-reviewer", [
      "scientific-feedback"
    ])
  }
  return loadSkillSystemPrompt(skillId)
}
