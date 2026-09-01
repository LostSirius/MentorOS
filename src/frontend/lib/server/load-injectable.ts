import fs from "fs"
import path from "path"

/** Load distill injectable system fragment (e.g. idea → idea.system.md). */
export function loadInjectableFragment(moduleId: string): string {
  const fileName = `${moduleId}.system.md`
  const candidates = [
    path.resolve(
      process.cwd(),
      "..",
      "..",
      "docs",
      "distill",
      "injectable",
      fileName
    ),
    path.resolve(process.cwd(), "..", "docs", "distill", "injectable", fileName),
    path.resolve(process.cwd(), "docs", "distill", "injectable", fileName)
  ]
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) return fs.readFileSync(file, "utf-8")
    } catch {
      /* skip */
    }
  }
  return ""
}
