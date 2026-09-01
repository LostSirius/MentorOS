import { DesktopPetHost } from "@/components/desktop-pet/desktop-pet-host"
import TranslationsProvider from "@/components/utility/translations-provider"
import initTranslations from "@/lib/i18n"
import { ReactNode } from "react"

interface LocaleLayoutProps {
  children: ReactNode
  params: {
    locale: string
  }
}

const i18nNamespaces = ["translation"]

export default async function LocaleLayout({
  children,
  params: { locale }
}: LocaleLayoutProps) {
  const { resources } = await initTranslations(locale, i18nNamespaces)

  return (
    <TranslationsProvider
      namespaces={i18nNamespaces}
      locale={locale}
      resources={resources}
    >
      {children}
      {/* Inside I18n so pet copy tracks en/zh; root layout stays for chat state. */}
      <DesktopPetHost />
    </TranslationsProvider>
  )
}
