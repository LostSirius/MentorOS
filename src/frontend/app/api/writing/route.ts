import { handleWritingCoachRequest } from "@/lib/server/writing-coach-handler"
import { NextRequest } from "next/server"

export const runtime = "nodejs"

/** From-scratch drafting: outline / draft_section / intro / nature_style */
export async function POST(request: NextRequest) {
  return handleWritingCoachRequest(request, "writing")
}
