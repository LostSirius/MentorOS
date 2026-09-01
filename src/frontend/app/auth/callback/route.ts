import { LOCAL_WORKSPACE_ID } from "@/lib/local/constants"
import { redirect } from "next/navigation"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const locale = requestUrl.pathname.split("/")[1] || "en"
  return Response.redirect(
    `${requestUrl.origin}/${locale}/${LOCAL_WORKSPACE_ID}/chat`
  )
}
