import { createRequire } from "module"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const require = createRequire(import.meta.url)

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "file required" }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    const buf = Buffer.from(await file.arrayBuffer())

    if (name.endsWith(".pdf")) {
      // Use lib entry to avoid pdf-parse debug/test-file side effects under Next.
      const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
        data: Buffer
      ) => Promise<{ text?: string }>
      const parsed = await pdfParse(buf)
      const text = (parsed.text || "").trim()
      if (!text) {
        return NextResponse.json(
          {
            message:
              "No extractable text in PDF (may be scanned images). Export as .txt/.md or OCR first."
          },
          { status: 422 }
        )
      }
      return NextResponse.json({
        name: file.name,
        text: text.slice(0, 40000)
      })
    }

    if (name.endsWith(".docx") || name.endsWith(".doc")) {
      const mammoth = require("mammoth") as typeof import("mammoth")
      const result = await mammoth.extractRawText({ buffer: buf })
      const text = (result.value || "").trim()
      if (!text) {
        return NextResponse.json(
          { message: "No extractable text in Word document" },
          { status: 422 }
        )
      }
      return NextResponse.json({
        name: file.name,
        text: text.slice(0, 40000)
      })
    }

    const text = buf.toString("utf8").slice(0, 40000)
    return NextResponse.json({
      name: file.name,
      text
    })
  } catch (error: any) {
    console.error("[extract-text]", error)
    return NextResponse.json(
      { message: error?.message || "extract failed" },
      { status: 500 }
    )
  }
}
