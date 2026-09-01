import { NextRequest, NextResponse } from "next/server"
import { executeQuery, QueryRequest } from "@/lib/local/engine"
import { LocalTable } from "@/lib/local/constants"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as QueryRequest
    if (!body.table || !body.action) {
      return NextResponse.json(
        { data: null, error: { message: "table and action are required" } },
        { status: 400 }
      )
    }
    const result = executeQuery({
      ...body,
      table: body.table as LocalTable
    })
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json(
      { data: null, error: { message: e.message || "local-db error" } },
      { status: 500 }
    )
  }
}
