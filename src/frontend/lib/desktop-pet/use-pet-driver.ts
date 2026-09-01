"use client"

import { CopilotContext } from "@/context/copilot-context"
import { ChatbotUIContext } from "@/context/context"
import {
  subscribePetEvents,
  type ScholarPetEventDetail
} from "@/lib/desktop-pet/events"
import {
  awardGrowth,
  loadPetProfile,
  subscribePetProfile,
  type PetProfile
} from "@/lib/desktop-pet/profile"
import type { GrowthEventId } from "@/lib/desktop-pet/economy"
import type { PetAction } from "@/lib/desktop-pet/types"
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

const ONE_SHOT: Partial<Record<PetAction, number>> = {
  happy: 2400,
  error: 3200,
  notification: 2800,
  idleLook: 2800,
  juggling: 2800
}

/**
 * Derive pet action from chat + research-module activity with simple priority:
 * one-shot reaction > chat gen > module work > idleLook > idle
 * Also applies growth awards into PetProfile.
 */
export function usePetDriver() {
  const { t } = useTranslation()
  const { isGenerating, firstTokenReceived } = useContext(ChatbotUIContext)
  const {
    literatureReviewLoading,
    literatureReviewError,
    ideaLoading,
    ideaError,
    experimentLoading,
    experimentError,
    writingLoading,
    writingError,
    figuresLoading,
    figuresError,
    reviewLoading,
    reviewError,
    graphLoading,
    graphError
  } = useContext(CopilotContext)

  const [action, setAction] = useState<PetAction>("idle")
  const [bubble, setBubble] = useState<string | null>(null)
  const [busyLocked, setBusyLocked] = useState(false)
  const [profile, setProfile] = useState<PetProfile>(() => loadPetProfile())

  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevGenerating = useRef(false)
  const skipNextSuccess = useRef(false)
  const prevLoadCount = useRef(0)
  const prevErrorKey = useRef("")
  const checkedIn = useRef(false)
  /** Suppress idle “spark” bubble right after a growth award. */
  const skipIdleSpark = useRef(false)

  useEffect(() => {
    setProfile(loadPetProfile())
    return subscribePetProfile(setProfile)
  }, [])

  useEffect(() => {
    if (checkedIn.current) return
    checkedIn.current = true
    const r = awardGrowth("daily_checkin")
    setProfile(r.profile)
  }, [])

  const showBubble = useCallback((text: string, ms = 1800) => {
    setBubble(text)
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current)
    bubbleTimer.current = setTimeout(() => setBubble(null), ms)
  }, [])

  const playAction = useCallback(
    (next: PetAction, holdMs?: number, lockBusy = false) => {
      setAction(next)
      if (actionTimer.current) clearTimeout(actionTimer.current)
      const ms = holdMs ?? ONE_SHOT[next]
      if (ms) {
        setBusyLocked(lockBusy || Boolean(ONE_SHOT[next]))
        actionTimer.current = setTimeout(() => {
          setBusyLocked(false)
          setAction("idle")
        }, ms)
      } else {
        setBusyLocked(false)
      }
    },
    []
  )

  const applyGrowth = useCallback(
    (eventId: GrowthEventId, quality?: "ok" | "warn" | "block") => {
      const result = awardGrowth(eventId, { quality })
      setProfile(result.profile)
      if (result.capped) return result
      if (result.leveledUp) {
        playAction("happy", 2800)
        showBubble(t("pet.bubble.levelUp", { level: result.profile.level }))
      } else if (result.gained.xp > 0) {
        showBubble(t("pet.bubble.xp", { xp: result.gained.xp }))
      }
      return result
    },
    [playAction, showBubble, t]
  )

  const moduleLoadCount = useMemo(() => {
    return [
      literatureReviewLoading,
      ideaLoading,
      experimentLoading,
      writingLoading,
      figuresLoading,
      reviewLoading,
      graphLoading
    ].filter(Boolean).length
  }, [
    literatureReviewLoading,
    ideaLoading,
    experimentLoading,
    writingLoading,
    figuresLoading,
    reviewLoading,
    graphLoading
  ])

  const errorKey = useMemo(() => {
    return [
      literatureReviewError,
      ideaError,
      experimentError,
      writingError,
      figuresError,
      reviewError,
      graphError
    ]
      .filter(Boolean)
      .join("|")
  }, [
    literatureReviewError,
    ideaError,
    experimentError,
    writingError,
    figuresError,
    reviewError,
    graphError
  ])

  // Chat stream
  useEffect(() => {
    if (isGenerating) {
      skipNextSuccess.current = false
      playAction(firstTokenReceived ? "working" : "thinking")
    } else if (prevGenerating.current) {
      if (skipNextSuccess.current) {
        skipNextSuccess.current = false
        playAction("idle")
      } else {
        // Ambient emotion only — research XP is reserved for user-confirmed progress.
        playAction("happy", 2400)
        showBubble(t("pet.bubble.ok"))
      }
    }
    prevGenerating.current = isGenerating
  }, [isGenerating, firstTokenReceived, playAction, showBubble, t])

  // Research modules: loading / building / success / error
  useEffect(() => {
    if (isGenerating) {
      prevLoadCount.current = moduleLoadCount
      return
    }

    if (errorKey && errorKey !== prevErrorKey.current) {
      prevErrorKey.current = errorKey
      playAction("error", 3200)
      showBubble(t("pet.bubble.err"))
      prevLoadCount.current = moduleLoadCount
      return
    }
    if (!errorKey) prevErrorKey.current = ""

    if (moduleLoadCount >= 2) {
      playAction("building")
    } else if (moduleLoadCount === 1) {
      playAction("working")
    } else if (prevLoadCount.current > 0 && moduleLoadCount === 0) {
      if (skipIdleSpark.current) {
        skipIdleSpark.current = false
      } else {
        playAction("notification", 2800)
        showBubble(t("pet.bubble.spark"))
      }
    }

    prevLoadCount.current = moduleLoadCount
  }, [moduleLoadCount, errorKey, isGenerating, playAction, showBubble, t])

  // Window bus
  useEffect(() => {
    return subscribePetEvents((detail: ScholarPetEventDetail) => {
      if (detail.type === "chat-cancelled") {
        skipNextSuccess.current = true
        playAction("idle")
        showBubble(t("pet.bubble.pause"), 1000)
        return
      }
      if (detail.type === "chat-error") {
        skipNextSuccess.current = true
        playAction("error", 3200)
        showBubble(detail.message?.slice(0, 12) || t("pet.bubble.err"))
        return
      }
      if (detail.type === "research-progress" && detail.growth) {
        skipIdleSpark.current = true
        applyGrowth(detail.growth, detail.quality ?? "ok")
        playAction("notification", 2800)
        return
      }
      if (detail.type === "notify") {
        playAction("notification", 2800)
        showBubble(detail.message?.slice(0, 12) || t("pet.bubble.spark"))
      }
    })
  }, [playAction, showBubble, applyGrowth, t])

  // Ambient idleLook — wilted mood uses longer gaps
  useEffect(() => {
    if (action !== "idle" || isGenerating || moduleLoadCount > 0 || busyLocked) {
      return
    }
    const base = profile.mood < 45 ? 22000 : 14000
    const id = setTimeout(
      () => {
        if (!isGenerating && moduleLoadCount === 0) playAction("idleLook", 2800)
      },
      base + Math.random() * 10000
    )
    return () => clearTimeout(id)
  }, [action, isGenerating, moduleLoadCount, busyLocked, playAction, profile.mood])

  const playInteractive = useCallback(
    (kind: "poke" | "double" | "cycle") => {
      if (isGenerating || moduleLoadCount > 0) return false
      if (kind === "double") {
        playAction("juggling", 2800)
        showBubble(t("pet.bubble.spark"))
      } else if (kind === "cycle") {
        playAction("happy", 1600)
      } else {
        // Soft petting — emotion only (decoration companion).
        playAction("happy", 2200)
        showBubble(t("pet.bubble.poke"))
      }
      return true
    },
    [isGenerating, moduleLoadCount, playAction, showBubble, t]
  )

  return {
    action,
    bubble,
    setBubble: showBubble,
    playAction,
    playInteractive,
    isSystemBusy: isGenerating || moduleLoadCount > 0,
    profile
  }
}
