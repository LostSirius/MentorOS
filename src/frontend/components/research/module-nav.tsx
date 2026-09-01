"use client"

import { moduleAccent } from "@/lib/research-module-accents"
import { RESEARCH_MODULES, ResearchModuleId } from "@/lib/research-modules"
import { cn } from "@/lib/utils"
import {
  IconBook2,
  IconBulb,
  IconFileText,
  IconFlask,
  IconLayoutDashboard,
  IconPencil,
  IconPhoto,
  IconScale
} from "@tabler/icons-react"
import Image from "next/image"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { ProfileSettings } from "../utility/profile-settings"

const ICONS: Record<ResearchModuleId, typeof IconBook2> = {
  overview: IconLayoutDashboard,
  literature: IconBook2,
  idea: IconBulb,
  experiment: IconFlask,
  writing: IconFileText,
  polish: IconPencil,
  figures: IconPhoto,
  review: IconScale
}

interface ModuleNavProps {
  active: ResearchModuleId
  onSelect: (id: ResearchModuleId) => void
}

export const ModuleNav: FC<ModuleNavProps> = ({ active, onSelect }) => {
  const { t } = useTranslation()

  return (
    <nav className="flex h-full w-[88px] shrink-0 flex-col items-center gap-1 border-r border-gray-200 bg-white/80 py-3 backdrop-blur-md dark:border-white/[0.06] dark:bg-[#0c0c12]/95">
      <button
        type="button"
        onClick={() => onSelect("overview")}
        aria-label="MentorOS overview"
        className="mb-3 flex w-[80px] flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70"
      >
        <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden">
          <Image
            src="/logo-mark.png"
            alt=""
            width={590}
            height={455}
            priority
            className="h-full w-full object-contain object-center"
          />
        </span>
        <span className="relative h-4 w-[76px] overflow-hidden">
          <Image
            src="/logo-wordmark.png"
            alt="MentorOS"
            width={809}
            height={159}
            priority
            className="h-full w-full object-contain object-center"
          />
        </span>
      </button>

      <div className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-1.5">
        {RESEARCH_MODULES.map(mod => {
          const Icon = ICONS[mod.id]
          const isActive = active === mod.id
          const disabled = mod.status === "coming"
          const accent = moduleAccent(mod.id)
          const label = t(`research.modules.${mod.id}.label`)
          const short = t(`research.modules.${mod.id}.short`)
          const suffix =
            mod.status === "placeholder"
              ? t("research.nav.placeholder")
              : disabled
                ? t("research.nav.coming")
                : ""
          return (
            <button
              key={mod.id}
              type="button"
              title={`${label}${suffix}`}
              disabled={disabled}
              onClick={() => onSelect(mod.id)}
              className={cn(
                "group relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-center transition",
                isActive
                  ? cn(accent.navActive, "!text-white")
                  : "text-gray-600 hover:bg-gray-100 dark:text-white/65 dark:hover:bg-white/[0.06]",
                disabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
              )}
            >
              <Icon size={22} stroke={1.5} />
              <span className="text-[10px] font-medium leading-tight">{short}</span>
              {mod.status === "placeholder" && !isActive && (
                <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-auto w-full border-t border-gray-200/80 px-1.5 pt-2 dark:border-white/[0.06]">
        <ProfileSettings variant="nav" defaultTab="keys" />
      </div>
    </nav>
  )
}
