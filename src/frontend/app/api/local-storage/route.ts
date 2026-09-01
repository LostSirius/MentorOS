import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { getUploadsRoot } from "@/lib/local/store"

export const runtime = "nodejs"

function resolveFile(bucket: string, filePath: string) {
  const root = path.join(getUploadsRoot(), bucket)
  const safe = filePath.replace(/^[/\\]+/, "").replace(/\.\./g, "")
  return path.join(root, safe)
}

export async function GET(req: NextRequest) {
  const bucket = req.nextUrl.searchParams.get("bucket")
  const filePath = req.nextUrl.searchParams.get("path")
  if (!bucket || !filePath) {
    return NextResponse.json({ error: "bucket and path required" }, { status: 400 })
  }
  const full = resolveFile(bucket, filePath)
  if (!fs.existsSync(full)) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const buffer = fs.readFileSync(full)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "private, max-age=3600"
    }
  })
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const bucket = String(form.get("bucket") || "")
    const filePath = String(form.get("path") || "")
    const file = form.get("file")
    if (!bucket || !filePath || !file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "invalid upload" }, { status: 400 })
    }
    const full = resolveFile(bucket, filePath)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(full, buffer)
    return NextResponse.json({ path: filePath })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const bucket = body.bucket as string
    const paths = (body.paths || []) as string[]
    for (const p of paths) {
      const full = resolveFile(bucket, p)
      if (fs.existsSync(full)) fs.unlinkSync(full)
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
