"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface PetSpriteProps {
  src: string
  size?: number
  eyeTracking?: boolean
  className?: string
}

/**
 * Preview parity without <object> white backdrop:
 * load SVG into an open ShadowRoot so @keyframes / #ids stay isolated
 * from the Next.js page, while the host stays truly transparent.
 */
export function PetSprite({
  src,
  size = 128,
  eyeTracking = true,
  className
}: PetSpriteProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const trackingRef = useRef({
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    lastFrameAt: 0,
    frame: 0 as number,
    returnTimer: 0 as number
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" })
    let cancelled = false

    shadow.innerHTML = ""
    svgRef.current = null

    fetch(src)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load ${src}`)
        return r.text()
      })
      .then(text => {
        if (cancelled) return
        shadow.innerHTML = `
          <style>
            :host { display: block; width: 100%; height: 100%; background: transparent; }
            .wrap { width: 100%; height: 100%; background: transparent; line-height: 0; }
            svg {
              width: 100%;
              height: 100%;
              display: block;
              background: transparent !important;
            }
          </style>
          <div class="wrap">${text}</div>
        `
        const svg = shadow.querySelector("svg")
        if (svg) {
          svg.removeAttribute("width")
          svg.removeAttribute("height")
          svg.setAttribute("width", "100%")
          svg.setAttribute("height", "100%")
          svg.style.background = "transparent"
          svg.style.setProperty("--play-state", "running")
          svgRef.current = svg
        }
      })
      .catch(() => {
        if (!cancelled) {
          shadow.innerHTML =
            '<div style="display:grid;place-items:center;width:100%;height:100%;opacity:.5;font:12px sans-serif">…</div>'
        }
      })

    return () => {
      cancelled = true
    }
  }, [src])

  useEffect(() => {
    if (!eyeTracking) return

    const POINTER = {
      eyeX: 3,
      eyeY: 3,
      bodyX: 16,
      bodyY: 12,
      bodyTilt: 3,
      shadowX: 12,
      shadowY: 5,
      shadowStretch: 0.08,
      smoothing: 0.2,
      returnDelayMs: 650,
      settle: 0.001
    }

    const writePointer = (nx: number, ny: number) => {
      const svg = svgRef.current
      if (!svg) return
      const x = Math.max(-1, Math.min(1, nx))
      const y = Math.max(-1, Math.min(1, ny))
      const distance = Math.min(1, Math.hypot(x, y))
      svg.style.setProperty("--eye-x", `${(x * POINTER.eyeX).toFixed(2)}px`)
      svg.style.setProperty("--eye-y", `${(y * POINTER.eyeY).toFixed(2)}px`)
      svg.style.setProperty("--body-x", `${(x * POINTER.bodyX).toFixed(2)}px`)
      svg.style.setProperty("--body-y", `${(y * POINTER.bodyY).toFixed(2)}px`)
      svg.style.setProperty(
        "--body-tilt",
        `${(x * POINTER.bodyTilt).toFixed(2)}deg`
      )
      svg.style.setProperty(
        "--shadow-x",
        `${(-x * POINTER.shadowX).toFixed(2)}px`
      )
      svg.style.setProperty(
        "--shadow-y",
        `${(-y * POINTER.shadowY).toFixed(2)}px`
      )
      svg.style.setProperty(
        "--shadow-stretch",
        (1 + distance * POINTER.shadowStretch).toFixed(3)
      )
    }

    const t = trackingRef.current

    const tick = (timestamp: number) => {
      t.frame = 0
      const elapsed = t.lastFrameAt
        ? Math.min(50, Math.max(1, timestamp - t.lastFrameAt))
        : 1000 / 60
      t.lastFrameAt = timestamp
      const frameRatio = elapsed / (1000 / 60)
      const alpha = 1 - Math.pow(1 - POINTER.smoothing, frameRatio)
      t.currentX += (t.targetX - t.currentX) * alpha
      t.currentY += (t.targetY - t.currentY) * alpha
      const settled =
        Math.abs(t.targetX - t.currentX) <= POINTER.settle &&
        Math.abs(t.targetY - t.currentY) <= POINTER.settle
      if (settled) {
        t.currentX = t.targetX
        t.currentY = t.targetY
        t.lastFrameAt = 0
      }
      writePointer(t.currentX, t.currentY)
      if (!settled) t.frame = requestAnimationFrame(tick)
    }

    const ensureFrame = () => {
      if (!t.frame) t.frame = requestAnimationFrame(tick)
    }

    const onMove = (e: MouseEvent) => {
      const host = hostRef.current
      if (!host) return
      const rect = host.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return
      const nx = Math.max(
        -1,
        Math.min(
          1,
          ((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * 0.85
        )
      )
      const ny = Math.max(
        -1,
        Math.min(
          1,
          ((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * 0.85
        )
      )
      t.targetX = nx
      t.targetY = ny
      window.clearTimeout(t.returnTimer)
      t.returnTimer = window.setTimeout(() => {
        t.targetX = 0
        t.targetY = 0
        ensureFrame()
      }, POINTER.returnDelayMs)
      ensureFrame()
    }

    window.addEventListener("mousemove", onMove, { passive: true })
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.clearTimeout(t.returnTimer)
      if (t.frame) cancelAnimationFrame(t.frame)
      t.frame = 0
      writePointer(0, 0)
    }
  }, [eyeTracking, src])

  return (
    <div
      ref={hostRef}
      className={cn("relative select-none bg-transparent", className)}
      style={{ width: size, height: size, background: "transparent" }}
    />
  )
}
