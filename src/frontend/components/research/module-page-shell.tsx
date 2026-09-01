"use client"

import { FC, ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Shared yellow-box content shell — keeps Literature / Idea / Experiment aligned. */
export const ModulePageShell: FC<{
  children: ReactNode
  className?: string
  /** Extra class on the inner max-width column */
  contentClassName?: string
}> = ({ children, className, contentClassName }) => {
  return (
    <div
      className={cn(
        "relative h-full min-h-0 w-full overflow-y-auto bg-[#f7f6f2] dark:bg-[#0b0d10]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(13,148,136,0.10),_transparent_58%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(45,212,191,0.07),_transparent_55%)]" />
      <div
        className={cn(
          "relative mx-auto w-full max-w-6xl px-5 pb-16 pt-7 sm:px-7 lg:px-8",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}
