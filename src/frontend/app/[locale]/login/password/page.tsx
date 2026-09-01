import { LOCAL_WORKSPACE_ID } from "@/lib/local/constants"
import { redirect } from "next/navigation"

export default async function PasswordPage({
  params
}: {
  params: { locale: string }
}) {
  const locale = params.locale || "en"
  redirect(`/${locale}/${LOCAL_WORKSPACE_ID}/chat`)
}
