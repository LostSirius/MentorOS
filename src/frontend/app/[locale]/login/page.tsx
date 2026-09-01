import { LOCAL_WORKSPACE_ID } from "@/lib/local/constants"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Login"
}

/** Local mode: no auth — redirect into the home workspace. */
export default async function Login({
  params
}: {
  params: { locale: string }
  searchParams: { message: string }
}) {
  const locale = params.locale || "en"
  redirect(`/${locale}/${LOCAL_WORKSPACE_ID}/chat`)
}
