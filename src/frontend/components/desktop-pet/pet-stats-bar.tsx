"use client"

import { getPetTheme } from "@/lib/desktop-pet/themes"
import {
  displayPetName,
  xpProgress,
  type PetProfile
} from "@/lib/desktop-pet/profile"
import type { PetCharacterId } from "@/lib/desktop-pet/types"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

function MiniBar({
  ratio,
  fill,
  track,
  label,
  short
}: {
  ratio: number
  fill: string
  track: string
  label: string
  short: string
}) {
  return (
    <div className="flex items-center gap-1" title={label}>
      <span className="w-3 shrink-0 text-[8px] opacity-80">{short}</span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full"
        style={{ background: track }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.round(ratio * 100)}%`, background: fill }}
        />
      </div>
    </div>
  )
}

/** Compact stats strip — only shown on hover. */
export function PetStatsBar({
  character,
  profile,
  onOpen,
  className
}: {
  character: PetCharacterId
  profile: PetProfile
  onOpen?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const theme = getPetTheme(character)
  const { ratio } = xpProgress(profile)
  const petName = displayPetName(profile, theme.label)

  return (
    <button
      type="button"
      onPointerDown={e => e.stopPropagation()}
      onPointerUp={e => e.stopPropagation()}
      onClick={e => {
        e.stopPropagation()
        onOpen?.()
      }}
      className={cn(
        "mt-1 w-full rounded-xl border px-2 py-1.5 text-left shadow-lg backdrop-blur-md transition hover:brightness-110",
        className
      )}
      style={{
        background: theme.panelBg,
        borderColor: theme.panelBorder,
        color: theme.text,
        boxShadow: `0 8px 24px ${theme.accentGlow}`
      }}
      title={t("pet.openDossier")}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span
          className="max-w-[70%] truncate rounded-full px-1.5 py-0.5 text-[9px] font-medium"
          style={{ background: theme.chipBg, color: theme.accent }}
          title={petName}
        >
          {petName}
        </span>
        <span className="text-[9px]" style={{ color: theme.muted }}>
          Lv.{profile.level}
        </span>
      </div>
      <div className="space-y-0.5">
        <MiniBar
          label={t("pet.statXp")}
          short="X"
          ratio={ratio}
          fill={theme.barFill}
          track={theme.barTrack}
        />
        <MiniBar
          label={t("pet.statBond")}
          short="B"
          ratio={Math.min(1, profile.bond / 100)}
          fill={theme.barFill}
          track={theme.barTrack}
        />
        <MiniBar
          label={t("pet.statVigor")}
          short="V"
          ratio={profile.vigor / 100}
          fill={theme.barFill}
          track={theme.barTrack}
        />
      </div>
    </button>
  )
}
