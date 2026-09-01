"use client"

import { cn } from "@/lib/utils"
import type { ResearchModuleId } from "@/lib/research-modules"
import { IconDownload } from "@tabler/icons-react"
import { FC, ReactNode } from "react"

/** Header secondary actions — readable on dark chrome (not near-black). */
export const HEADER_ACTION_BTN =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-300/90 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/25 dark:bg-[#1a1d24] dark:text-white/90 dark:shadow-none dark:hover:border-white/35 dark:hover:bg-white/[0.12]"

/** Shared MD / JSON export controls — place at top-right of module headers. */
export const ModuleExportActions: FC<{
  onExportMd: () => void
  onExportJson: () => void
  disabled?: boolean
  className?: string
}> = ({ onExportMd, onExportJson, disabled, className }) => {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-end gap-2",
        className
      )}
    >
      <button
        type="button"
        onClick={onExportMd}
        disabled={disabled}
        className={HEADER_ACTION_BTN}
      >
        <IconDownload size={14} stroke={1.75} />
        MD
      </button>
      <button
        type="button"
        onClick={onExportJson}
        disabled={disabled}
        className={HEADER_ACTION_BTN}
      >
        <IconDownload size={14} stroke={1.75} />
        JSON
      </button>
    </div>
  )
}

/**
 * Module page header: theme badge + neutral title left, actions top-right.
 */
export const ModulePageHeader: FC<{
  moduleId: ResearchModuleId
  badge: ReactNode
  title: string
  subtitle: string
  actions?: ReactNode
}> = ({ badge, title, subtitle, actions }) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        {badge}
        <h1 className="font-serif text-[1.75rem] leading-tight tracking-tight text-stone-900 dark:text-white/95">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-stone-500 dark:text-white/50">
          {subtitle}
        </p>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-1">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
