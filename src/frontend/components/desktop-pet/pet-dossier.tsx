"use client"

import { stageFromLevel } from "@/lib/desktop-pet/economy"
import {
  PET_NAME_MAX,
  displayPetName,
  setPetName,
  xpProgress,
  type PetProfile
} from "@/lib/desktop-pet/profile"
import { getPetTheme } from "@/lib/desktop-pet/themes"
import type { PetCharacterId } from "@/lib/desktop-pet/types"
import { READY_PET_CHARACTER_IDS, PET_CHARACTERS } from "@/lib/desktop-pet/catalog"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

function badgeLabel(t: (k: string) => string, id: string) {
  const key = `pet.badge.${id}`
  const translated = t(key)
  return translated === key ? id : translated
}

/** Full dossier panel — opens on click. */
export function PetDossier({
  character,
  profile,
  open,
  skinLocked,
  onClose,
  onSelectCharacter,
  onFollowModel
}: {
  character: PetCharacterId
  profile: PetProfile
  open: boolean
  skinLocked: boolean
  onClose: () => void
  onSelectCharacter: (id: PetCharacterId) => void
  onFollowModel: () => void
}) {
  const { t } = useTranslation()
  const [draftName, setDraftName] = useState(profile.name || "")
  const [nameSaved, setNameSaved] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setDraftName(profile.name || "")
      setNameSaved(false)
    }
  }, [open, profile.name])

  if (!open) return null

  const theme = getPetTheme(character)
  const { need, ratio } = xpProgress(profile)
  const stage = t(`pet.stages.${stageFromLevel(profile.level)}`)
  const tagline = t(`pet.characters.${character}.tagline`)
  const shownName = displayPetName(profile, theme.label)
  const dirty = draftName.trim() !== (profile.name || "").trim()

  const commitName = () => {
    setPetName(draftName)
    setNameSaved(true)
    window.setTimeout(() => setNameSaved(false), 1200)
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[10000]">
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 bg-black/25"
        aria-label={t("pet.closeDossier")}
        onClick={onClose}
      />
      <div
        className="pointer-events-auto absolute bottom-24 right-6 flex max-h-[min(78vh,640px)] w-[min(320px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          background: theme.panelBg,
          borderColor: theme.panelBorder,
          color: theme.text,
          boxShadow: `0 20px 50px ${theme.accentGlow}`
        }}
        role="dialog"
        aria-label={t("pet.openDossier")}
      >
        <div
          className="relative px-4 pb-3 pt-4"
          style={{
            background: `radial-gradient(ellipse at 20% 0%, ${theme.accentSoft}, transparent 55%)`
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight">
                {shownName}
              </div>
              <div className="text-[11px]" style={{ color: theme.muted }}>
                {theme.label} · {tagline}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full px-2 py-0.5 text-xs opacity-70 hover:opacity-100"
              style={{ background: theme.chipBg }}
              aria-label={t("pet.closeDossier")}
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{ background: theme.chipBg, color: theme.accent }}
            >
              {t("pet.levelStage", { level: profile.level, stage })}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{ background: theme.chipBg }}
            >
              {t("pet.streak", { days: profile.streakDays })}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{ background: theme.chipBg }}
            >
              {t("pet.mood", { value: Math.round(profile.mood) })}
            </span>
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-3">
          <div>
            <div className="mb-1 text-[10px]" style={{ color: theme.muted }}>
              {t("pet.nameLabel")}
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={draftName}
                maxLength={PET_NAME_MAX}
                placeholder={t("pet.namePlaceholder")}
                onChange={e => setDraftName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    commitName()
                  }
                }}
                onPointerDown={e => e.stopPropagation()}
                className="min-w-0 flex-1 rounded-lg border bg-transparent px-2 py-1.5 text-xs outline-none"
                style={{
                  borderColor: theme.panelBorder,
                  color: theme.text
                }}
                aria-label={t("pet.nameLabel")}
              />
              <button
                type="button"
                onClick={commitName}
                disabled={!dirty && !nameSaved}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition disabled:opacity-40"
                style={{
                  background: theme.chipBg,
                  color: theme.accent
                }}
              >
                {nameSaved ? "✓" : t("pet.nameSave")}
              </button>
            </div>
            <p className="mt-1 text-[9px] opacity-50">
              {t("pet.nameHint", { max: PET_NAME_MAX })}
            </p>
          </div>

          <StatRow
            label={t("pet.statXp")}
            value={`${profile.xp} / ${need}`}
            ratio={ratio}
            theme={theme}
          />
          <StatRow
            label={t("pet.statBond")}
            value={`${profile.bond}`}
            ratio={Math.min(1, profile.bond / 100)}
            theme={theme}
          />
          <StatRow
            label={t("pet.statInk")}
            value={`${profile.ink}`}
            ratio={Math.min(1, profile.ink / 200)}
            theme={theme}
          />
          <StatRow
            label={t("pet.statVigor")}
            value={`${Math.round(profile.vigor)}`}
            ratio={profile.vigor / 100}
            theme={theme}
          />

          <div>
            <div className="mb-1.5 text-[10px]" style={{ color: theme.muted }}>
              {t("pet.badges")}
            </div>
            <div className="flex flex-wrap gap-1">
              {profile.badges.length === 0 ? (
                <span className="text-[10px] opacity-60">
                  {t("pet.badgesEmpty")}
                </span>
              ) : (
                profile.badges.map(b => (
                  <span
                    key={b}
                    className="rounded-md px-1.5 py-0.5 text-[10px]"
                    style={{ background: theme.chipBg, color: theme.accent }}
                  >
                    {badgeLabel(t, b)}
                  </span>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px]" style={{ color: theme.muted }}>
                {t("pet.switchSkin")}
              </span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px]"
                style={{ background: theme.chipBg, color: theme.accent }}
              >
                {skinLocked ? t("pet.skinLocked") : t("pet.skinFollowing")}
              </span>
            </div>
            <p className="mb-1.5 text-[9px] opacity-50">
              {skinLocked ? t("pet.skinLockHint") : t("pet.skinFollowHint")}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {READY_PET_CHARACTER_IDS.map(id => {
                const active = id === character
                const skin = getPetTheme(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectCharacter(id)}
                    className={cn(
                      "rounded-lg border px-1 py-1.5 text-[10px] transition",
                      active && "outline outline-1"
                    )}
                    style={{
                      background: skin.chipBg,
                      borderColor: active ? skin.accent : "transparent",
                      color: skin.text,
                      outlineColor: active ? skin.accent : "transparent"
                    }}
                  >
                    {PET_CHARACTERS[id].displayName}
                  </button>
                )
              })}
            </div>
            {skinLocked ? (
              <button
                type="button"
                onClick={onFollowModel}
                className="mt-2 w-full rounded-lg border px-2 py-1.5 text-[10px] transition hover:brightness-110"
                style={{
                  borderColor: theme.panelBorder,
                  color: theme.muted
                }}
              >
                {t("pet.skinFollowModel")}
              </button>
            ) : null}
          </div>

          <div
            className="rounded-xl border px-2.5 py-2"
            style={{ borderColor: theme.panelBorder }}
          >
            <button
              type="button"
              onClick={() => setGuideOpen(v => !v)}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="text-[11px] font-medium">{t("pet.growthGuide.title")}</span>
              <span className="text-[9px]" style={{ color: theme.accent }}>
                {guideOpen
                  ? t("pet.growthGuide.toggleHide")
                  : t("pet.growthGuide.toggleShow")}
              </span>
            </button>
            {guideOpen ? (
              <div
                className="mt-2 space-y-2.5 text-[10px] leading-relaxed"
                style={{ color: theme.muted }}
              >
                <p>{t("pet.growthGuide.intro")}</p>
                <GuideBlock
                  title={t("pet.growthGuide.earnTitle")}
                  body={t("pet.growthGuide.earnBody")}
                  accent={theme.accent}
                />
                <GuideBlock
                  title={t("pet.growthGuide.statsTitle")}
                  body={t("pet.growthGuide.statsBody")}
                  accent={theme.accent}
                />
                <GuideBlock
                  title={t("pet.growthGuide.stagesTitle")}
                  body={t("pet.growthGuide.stagesBody")}
                  accent={theme.accent}
                />
                <GuideBlock
                  title={t("pet.growthGuide.rulesTitle")}
                  body={t("pet.growthGuide.rulesBody")}
                  accent={theme.accent}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function GuideBlock({
  title,
  body,
  accent
}: {
  title: string
  body: string
  accent: string
}) {
  return (
    <div>
      <div className="mb-0.5 font-medium" style={{ color: accent }}>
        {title}
      </div>
      <div className="whitespace-pre-line opacity-90">{body}</div>
    </div>
  )
}

function StatRow({
  label,
  value,
  ratio,
  theme
}: {
  label: string
  value: string
  ratio: number
  theme: ReturnType<typeof getPetTheme>
}) {
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px]">
        <span style={{ color: theme.muted }}>{label}</span>
        <span>{value}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ background: theme.barTrack }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.round(Math.min(1, ratio) * 100)}%`,
            background: theme.barFill
          }}
        />
      </div>
    </div>
  )
}
