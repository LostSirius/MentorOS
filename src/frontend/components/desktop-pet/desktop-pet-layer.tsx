"use client"

import { PetDossier } from "@/components/desktop-pet/pet-dossier"
import { PetSprite } from "@/components/desktop-pet/pet-sprite"
import { PetStatsBar } from "@/components/desktop-pet/pet-stats-bar"
import { ChatbotUIContext } from "@/context/context"
import {
  DEFAULT_PET_CHARACTER,
  PET_CHARACTERS,
  READY_PET_CHARACTER_IDS,
  displayPetName,
  resolvePetAssetUrl,
  resolvePetCharacter,
  usePetDriver,
  type PetCharacterId
} from "@/lib/desktop-pet"
import { getPetTheme } from "@/lib/desktop-pet/themes"
import { LLM_LIST } from "@/lib/models/llm/llm-list"
import { cn } from "@/lib/utils"
import { useContext, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { migrateLocalStorageKey } from "@/lib/migrate-storage-keys"

const POS_KEY = "mentoros-pet-pos"
const CHAR_OVERRIDE_KEY = "mentoros-pet-character"
const HIDDEN_KEY = "mentoros-pet-hidden"
const PET_SIZE = 128
const PEEK_SIZE = 40
/** Hide mini chrome shortly after pointer leaves. */
const HOVER_LEAVE_MS = 280

type Pos = { x: number; y: number }

function clampPos(x: number, y: number, size = PET_SIZE): Pos {
  if (typeof window === "undefined") return { x, y }
  const maxX = Math.max(8, window.innerWidth - size - 8)
  const maxY = Math.max(8, window.innerHeight - size - 48)
  return {
    x: Math.min(maxX, Math.max(8, x)),
    y: Math.min(maxY, Math.max(8, y))
  }
}

function defaultPos(): Pos {
  if (typeof window === "undefined") return { x: 24, y: 24 }
  return clampPos(
    window.innerWidth - PET_SIZE - 28,
    window.innerHeight - PET_SIZE - 56
  )
}

/**
 * Independent overlay pet. Idle: sprite only (no glow / stats).
 * Hover: mini stats. Click: full dossier.
 */
export function DesktopPetLayer() {
  const { t } = useTranslation()
  const {
    chatSettings,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels,
    models
  } = useContext(ChatbotUIContext)

  const {
    action,
    bubble,
    setBubble,
    playAction,
    playInteractive,
    isSystemBusy,
    profile
  } = usePetDriver()

  const [pos, setPos] = useState<Pos>(() => defaultPos())
  const [mounted, setMounted] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [dossierOpen, setDossierOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [manualCharacter, setManualCharacter] = useState<PetCharacterId | null>(
    null
  )

  const dragRef = useRef<{
    active: boolean
    moved: boolean
    ox: number
    oy: number
    startX: number
    startY: number
  } | null>(null)
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickCount = useRef(0)
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
    try {
      migrateLocalStorageKey("scholar-pet-pos", POS_KEY)
      migrateLocalStorageKey("scholar-pet-character", CHAR_OVERRIDE_KEY)
      migrateLocalStorageKey("scholar-pet-hidden", HIDDEN_KEY)
      const raw = localStorage.getItem(POS_KEY)
      if (raw) setPos(clampPos(...(JSON.parse(raw) as [number, number])))
      else setPos(defaultPos())
      const ch = localStorage.getItem(CHAR_OVERRIDE_KEY) as PetCharacterId | null
      if (ch && READY_PET_CHARACTER_IDS.includes(ch)) setManualCharacter(ch)
      setHidden(localStorage.getItem(HIDDEN_KEY) === "1")
    } catch {
      setPos(defaultPos())
    }

    const onResize = () => setPos(p => clampPos(p.x, p.y))
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current)
      if (clickTimer.current) clearTimeout(clickTimer.current)
    }
  }, [])

  const providerHint = useMemo(() => {
    const modelId = chatSettings?.model
    if (!modelId) return null
    const all: { modelId: string; provider: string }[] = [
      ...LLM_LIST,
      ...availableHostedModels,
      ...availableLocalModels,
      ...availableOpenRouterModels,
      ...models.map(m => ({
        modelId: m.model_id,
        provider: "custom"
      }))
    ]
    const hit = all.find(m => m.modelId === modelId)
    // Include model id so gateway skins (e.g. groq + qwen/...) resolve correctly.
    return [hit?.provider, modelId].filter(Boolean).join(" ") || String(modelId)
  }, [
    chatSettings?.model,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels,
    models
  ])

  const character: PetCharacterId = useMemo(() => {
    if (manualCharacter && READY_PET_CHARACTER_IDS.includes(manualCharacter)) {
      return manualCharacter
    }
    const resolved = resolvePetCharacter(providerHint)
    if (READY_PET_CHARACTER_IDS.includes(resolved)) return resolved
    return DEFAULT_PET_CHARACTER
  }, [manualCharacter, providerHint])

  const theme = getPetTheme(character)
  const tagline = t(`pet.characters.${character}.tagline`)
  const petName = displayPetName(profile, theme.label)
  const assetUrl =
    resolvePetAssetUrl(character, action) ||
    resolvePetAssetUrl(character, "idle")

  /** Glow + mini stats only while pointer is over the pet. */
  const showChrome = hovered

  const clearHoverLeave = () => {
    if (hoverLeaveTimer.current) {
      clearTimeout(hoverLeaveTimer.current)
      hoverLeaveTimer.current = null
    }
  }

  const onPetEnter = () => {
    clearHoverLeave()
    setHovered(true)
  }

  const onPetLeave = () => {
    clearHoverLeave()
    hoverLeaveTimer.current = setTimeout(() => {
      setHovered(false)
      hoverLeaveTimer.current = null
    }, HOVER_LEAVE_MS)
  }

  const selectCharacter = (id: PetCharacterId) => {
    setManualCharacter(id)
    localStorage.setItem(CHAR_OVERRIDE_KEY, id)
    playInteractive("cycle")
    setBubble(PET_CHARACTERS[id].displayName)
  }

  /** Clear manual lock — skin follows the active model again. */
  const followModel = () => {
    setManualCharacter(null)
    localStorage.removeItem(CHAR_OVERRIDE_KEY)
    const resolved = resolvePetCharacter(providerHint)
    const next = READY_PET_CHARACTER_IDS.includes(resolved)
      ? resolved
      : DEFAULT_PET_CHARACTER
    playAction("happy", 1600)
    setBubble(PET_CHARACTERS[next].displayName)
  }

  const skinLocked = Boolean(
    manualCharacter && READY_PET_CHARACTER_IDS.includes(manualCharacter)
  )

  const cycleCharacter = () => {
    const idx = READY_PET_CHARACTER_IDS.indexOf(character)
    const next =
      READY_PET_CHARACTER_IDS[(idx + 1) % READY_PET_CHARACTER_IDS.length]
    selectCharacter(next)
  }

  const setHiddenPersist = (value: boolean) => {
    setHidden(value)
    localStorage.setItem(HIDDEN_KEY, value ? "1" : "0")
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      active: true,
      moved: false,
      ox: e.clientX - pos.x,
      oy: e.clientY - pos.y,
      startX: e.clientX,
      startY: e.clientY
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d?.active) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (Math.hypot(dx, dy) > 4) {
      d.moved = true
      if (!isSystemBusy) playAction("working")
      setPos(clampPos(e.clientX - d.ox, e.clientY - d.oy))
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    if (!d) return

    if (d.moved) {
      setPos(p => {
        const next = clampPos(p.x, p.y)
        localStorage.setItem(POS_KEY, JSON.stringify([next.x, next.y]))
        return next
      })
      if (!isSystemBusy) playAction("idle")
      return
    }

    if (e.altKey) {
      setHiddenPersist(true)
      return
    }

    if (e.shiftKey) {
      cycleCharacter()
      return
    }

    clickCount.current += 1
    if (clickTimer.current) clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => {
      const n = clickCount.current
      clickCount.current = 0
      // Emotion-only reactions; research XP is separate from petting.
      if (n >= 2) {
        playInteractive("double")
      } else if (!isSystemBusy) {
        playAction("happy", 1800)
      }
      setDossierOpen(true)
    }, 240)
  }

  if (!mounted || !assetUrl) return null

  if (hidden) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[9999]">
        <button
          type="button"
          className="pointer-events-auto absolute flex items-center justify-center rounded-full border text-[12px] font-semibold shadow-lg backdrop-blur"
          style={{
            right: 16,
            bottom: 16,
            width: PEEK_SIZE,
            height: PEEK_SIZE,
            background: theme.panelBg,
            borderColor: theme.panelBorder,
            color: theme.accent,
            boxShadow: `0 8px 20px ${theme.accentGlow}`
          }}
          title={t("pet.showPet")}
          onClick={() => setHiddenPersist(false)}
        >
          {petName.slice(0, 1)}
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[9999]">
        <div
          className={cn(
            "pointer-events-auto absolute touch-none",
            "cursor-grab active:cursor-grabbing"
          )}
          style={{ left: pos.x, top: pos.y, width: PET_SIZE }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerEnter={onPetEnter}
          onPointerLeave={onPetLeave}
          onContextMenu={e => {
            e.preventDefault()
            cycleCharacter()
          }}
          title={`${petName} · ${tagline}`}
        >
          {bubble && (
            <div
              className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] shadow"
              style={{
                background: theme.panelBg,
                borderColor: theme.panelBorder,
                color: theme.text
              }}
            >
              {bubble}
            </div>
          )}
          <div
            className="rounded-2xl p-0.5 transition-[box-shadow] duration-300"
            style={{
              boxShadow: showChrome
                ? profile.mood < 45
                  ? `0 0 0 1px ${theme.panelBorder}`
                  : `0 0 24px ${theme.accentGlow}`
                : "none"
            }}
          >
            <PetSprite
              src={assetUrl}
              size={PET_SIZE}
              eyeTracking={action === "idle"}
            />
          </div>
          {showChrome && (
            <PetStatsBar
              character={character}
              profile={profile}
              onOpen={() => setDossierOpen(true)}
              className="animate-in fade-in-0 zoom-in-95 duration-200"
            />
          )}
          {showChrome && isSystemBusy && (
            <div
              className="mt-0.5 text-center text-[9px]"
              style={{ color: theme.muted }}
            >
              {t("pet.busy")}
            </div>
          )}
        </div>
      </div>

      <PetDossier
        character={character}
        profile={profile}
        open={dossierOpen}
        skinLocked={skinLocked}
        onClose={() => setDossierOpen(false)}
        onSelectCharacter={selectCharacter}
        onFollowModel={followModel}
      />
    </>
  )
}
