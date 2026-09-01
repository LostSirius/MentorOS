"use client"

import initTranslations from "@/lib/i18n"
import { createInstance, type i18n as I18nType } from "i18next"
import { useEffect, useRef } from "react"
import { I18nextProvider } from "react-i18next"

function mergeResources(i18n: I18nType, resources: any) {
  if (!resources) return
  for (const lng of Object.keys(resources)) {
    const bundle = resources[lng] || {}
    for (const ns of Object.keys(bundle)) {
      i18n.addResourceBundle(lng, ns, bundle[ns], true, true)
    }
  }
}

function langsMatch(a: string | undefined, b: string | undefined): boolean {
  const left = String(a || "")
    .toLowerCase()
    .split("-")[0]
  const right = String(b || "")
    .toLowerCase()
    .split("-")[0]
  if (!left || !right) return false
  return left === right
}

export default function TranslationsProvider({
  children,
  locale,
  namespaces,
  resources
}: {
  children: React.ReactNode
  locale: string
  namespaces: string[]
  resources: any
}) {
  const i18nRef = useRef<I18nType | null>(null)
  if (!i18nRef.current) {
    i18nRef.current = createInstance()
  }
  const i18n = i18nRef.current
  const resourcesRef = useRef(resources)
  resourcesRef.current = resources

  // Merge freshly streamed bundles without tying language switches to object identity
  useEffect(() => {
    if (!i18n.isInitialized) return
    mergeResources(i18n, resources)
  }, [i18n, resources])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!i18n.isInitialized) {
          await initTranslations(
            locale,
            namespaces,
            i18n,
            resourcesRef.current
          )
        } else {
          mergeResources(i18n, resourcesRef.current)
          if (!langsMatch(i18n.language, locale)) {
            await i18n.changeLanguage(locale)
          }
        }
        if (!cancelled) {
          i18n.emit("languageChanged", i18n.language)
        }
      } catch {
        /* init / changeLanguage failures should not blank the tree */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [i18n, locale, namespaces])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
