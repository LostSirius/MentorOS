/** Shared upload accept lists for research modules (multi-format). */

export const RESEARCH_DOC_ACCEPT =
  ".pdf,.txt,.md,.markdown,.docx,.doc,.rtf,.tex,.bib,.json,.csv,.tsv,.yaml,.yml,.xml,.html,.htm,.log,.out,.ipynb"

export const RESEARCH_DOC_AND_IMAGE_ACCEPT = `${RESEARCH_DOC_ACCEPT},image/*`

export const RESEARCH_EXPERIMENT_ACCEPT =
  ".pdf,.txt,.md,.markdown,.docx,.doc,.json,.csv,.tsv,.log,.yaml,.yml,.out,.xml,.html,.htm,.ipynb,.tex"

const TEXTISH_RE =
  /\.(txt|md|markdown|csv|tsv|json|tex|bib|yaml|yml|xml|html?|log|out|rtf|ipynb)$/i

/** Best-effort text extraction; PDF/DOCX via /api/extract-text when available. */
export async function readResearchFileAsText(file: File): Promise<string> {
  const name = file.name

  if (file.type.startsWith("image/")) {
    return `[User image: ${name}]`
  }

  const lower = name.toLowerCase()
  if (TEXTISH_RE.test(lower)) {
    try {
      const text = await file.text()
      return text?.trim()
        ? `[File: ${name}]\n${text.slice(0, 40000)}`
        : `[File: ${name} — empty]`
    } catch {
      return `[File: ${name} — text extraction failed]`
    }
  }

  if (lower.endsWith(".pdf") || lower.endsWith(".docx") || lower.endsWith(".doc")) {
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/extract-text", {
        method: "POST",
        body: form
      })
      if (res.ok) {
        const data = (await res.json()) as { text?: string }
        if (data.text?.trim()) {
          return `[File: ${name}]\n${data.text.trim().slice(0, 40000)}`
        }
      } else {
        let detail = ""
        try {
          const err = (await res.json()) as { message?: string }
          detail = err.message || ""
        } catch {
          /* ignore */
        }
        return `[File: ${name} — could not extract text${detail ? `: ${detail}` : ""}; try .txt/.md/.docx]`
      }
    } catch {
      /* fall through */
    }
    return `[File: ${name} — could not extract text; paste contents as .txt/.md if needed]`
  }

  try {
    const text = await file.text()
    return text?.trim()
      ? `[File: ${name}]\n${text.slice(0, 40000)}`
      : `[File: ${name} — empty]`
  } catch {
    return `[File: ${name} — text extraction failed]`
  }
}
