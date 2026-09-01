/** Shared helpers for research-module export (clipboard + file download). */

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8"
): void {
  if (typeof window === "undefined") return
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function copyText(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content)
    return true
  } catch {
    return false
  }
}

/**
 * Copy to clipboard and download a file. Returns whether clipboard succeeded.
 */
export async function exportTextArtifact(opts: {
  filename: string
  content: string
  mime?: string
}): Promise<boolean> {
  downloadTextFile(
    opts.filename,
    opts.content,
    opts.mime || "text/plain;charset=utf-8"
  )
  return copyText(opts.content)
}

export function stampFilename(prefix: string, ext: "md" | "json"): string {
  const d = new Date()
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
    "-",
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0")
  ].join("")
  return `${prefix}-${stamp}.${ext}`
}
