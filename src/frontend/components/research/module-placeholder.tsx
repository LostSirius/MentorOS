"use client"

import { RESEARCH_MODULES, ResearchModuleId } from "@/lib/research-modules"
import { IconRocket } from "@tabler/icons-react"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { ModulePageShell } from "./module-page-shell"

interface ModulePlaceholderProps {
  moduleId: ResearchModuleId
}

export const ModulePlaceholder: FC<ModulePlaceholderProps> = ({ moduleId }) => {
  const { t } = useTranslation()
  const meta = RESEARCH_MODULES.find(m => m.id === moduleId)
  const label = meta
    ? t(`research.modules.${meta.id}.label`)
    : t("research.placeholder.fallbackTitle")

  return (
    <ModulePageShell contentClassName="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-teal-600/20 bg-teal-600/10 text-teal-700 dark:border-teal-400/20 dark:text-teal-300">
        <IconRocket size={28} />
      </div>
      <div className="mt-4 max-w-md text-center">
        <h2 className="text-xl font-semibold tracking-tight text-stone-800 dark:text-white/90">
          {label}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-white/45">
          {meta?.status === "placeholder"
            ? t("research.placeholder.overviewBody")
            : t("research.placeholder.comingBody")}
        </p>
      </div>
    </ModulePageShell>
  )
}
