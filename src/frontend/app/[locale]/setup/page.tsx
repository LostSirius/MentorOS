"use client"

import { LOCAL_WORKSPACE_ID } from "@/lib/local/constants"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

/** Local mode skips onboarding — go straight to chat. */
export default function SetupPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params.locale as string) || "en"

  useEffect(() => {
    router.replace(`/${locale}/${LOCAL_WORKSPACE_ID}/chat`)
  }, [locale, router])

  return (
    <div className="flex size-full items-center justify-center">
      <div className="text-muted-foreground text-sm">Local mode ready…</div>
    </div>
  )
}
