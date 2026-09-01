"use client"

import { LOCAL_WORKSPACE_ID } from "@/lib/local/constants"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

/** Local single-user mode: jump straight into the home workspace. */
export default function HomePage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params.locale as string) || "en"

  useEffect(() => {
    router.replace(`/${locale}/${LOCAL_WORKSPACE_ID}/chat`)
  }, [locale, router])

  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div className="text-muted-foreground text-sm">Entering local workspace…</div>
    </div>
  )
}
