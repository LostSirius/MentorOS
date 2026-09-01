"use client"

import { useRouter, usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { FC, useState, useRef, useEffect } from "react"
import { IconLanguage } from "@tabler/icons-react"

const LANGUAGES = [
  { code: "en", label: "English", flag: "EN" },
  { code: "zh", label: "中文", flag: "中" }
]

function normalizeLang(lang: string | undefined): string {
  if (!lang) return "en"
  return lang.toLowerCase().startsWith("zh") ? "zh" : "en"
}

function pathWithLocale(pathname: string, code: string): string {
  const segments = pathname.split("/")
  // "/en/workspace/..." → segments[1] is locale
  if (segments.length > 1 && LANGUAGES.some(l => l.code === segments[1])) {
    segments[1] = code
    return segments.join("/") || `/${code}`
  }
  if (segments.length > 1 && segments[1] === "") {
    return `/${code}`
  }
  // Locale missing from path — insert it
  segments.splice(1, 0, code)
  return segments.join("/") || `/${code}`
}

export const LanguageSwitcher: FC = () => {
  const { i18n } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pendingTimer = useRef<number | null>(null)

  const pathLang = (() => {
    const seg = pathname.split("/")[1]
    return LANGUAGES.some(l => l.code === seg) ? seg : null
  })()
  const currentLang = normalizeLang(pathLang || i18n.language)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Keep i18n aligned with URL after soft-nav / refresh
  useEffect(() => {
    if (!pathLang) return
    if (normalizeLang(i18n.language) === pathLang) return
    void i18n.changeLanguage(pathLang)
  }, [pathLang, i18n])

  useEffect(() => {
    return () => {
      if (pendingTimer.current != null) {
        window.clearTimeout(pendingTimer.current)
      }
    }
  }, [])

  const switchLanguage = (code: string) => {
    if (code === currentLang || pending) {
      setOpen(false)
      return
    }
    const newPath = pathWithLocale(pathname, code)
    setOpen(false)
    setPending(true)

    void (async () => {
      try {
        // Apply chrome language immediately. Idea/eval leaves a lot of client
        // state; waiting only on RSC soft-nav often stalls and looks "failed".
        if (normalizeLang(i18n.language) !== code) {
          await i18n.changeLanguage(code)
        }
        document.documentElement.lang = code === "zh" ? "zh-CN" : "en"
        if (newPath !== pathname) {
          router.replace(newPath)
        }
      } catch {
        /* soft-nav / i18n errors should not leave the control stuck */
      } finally {
        if (pendingTimer.current != null) {
          window.clearTimeout(pendingTimer.current)
        }
        pendingTimer.current = window.setTimeout(() => {
          setPending(false)
          pendingTimer.current = null
        }, 400)
      }
    })()
  }

  const current = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-xs text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/60 dark:hover:border-white/15 dark:hover:bg-white/[0.08] dark:hover:text-white/80"
      >
        <IconLanguage size={15} />
        <span className="font-medium">{current.flag}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white/95 p-1 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1a2e]/95">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              disabled={pending}
              onClick={() => switchLanguage(lang.code)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
                lang.code === currentLang
                  ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-white/60 dark:hover:bg-white/[0.06] dark:hover:text-white/80"
              }`}
            >
              <span className="flex size-6 items-center justify-center rounded-md bg-gray-100 text-xs font-bold dark:bg-white/[0.06]">
                {lang.flag}
              </span>
              <span>{lang.label}</span>
              {lang.code === currentLang ? (
                <span className="ml-auto inline-block size-1.5 rounded-full bg-teal-500" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
