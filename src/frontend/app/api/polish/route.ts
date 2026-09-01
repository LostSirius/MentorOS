import { handleWritingCoachRequest } from "@/lib/server/writing-coach-handler"
import { NextRequest } from "next/server"

export const runtime = "nodejs"

/** Existing-draft polish/revise: polish / revise_feedback / revise_scoped */
export async function POST(request: NextRequest) {
  return handleWritingCoachRequest(request, "polish")
}
