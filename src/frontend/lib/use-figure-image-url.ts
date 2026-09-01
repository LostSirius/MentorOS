"use client"

import {
  getFigureImageObjectUrl,
  isFigureImageIdbRef
} from "@/lib/figure-image-store"
import { useEffect, useState } from "react"

export type FigureImageStatus = "none" | "direct" | "loading" | "ready" | "missing"

/**
 * Resolve figure imageUrl for <img src>.
 * Supports http(s), data:, blob:, and idb:figure-img: refs.
 */
export function useFigureImageUrl(imageUrl: string | undefined | null): {
  src: string | undefined
  status: FigureImageStatus
} {
  const [src, setSrc] = useState<string | undefined>(() =>
    imageUrl && !isFigureImageIdbRef(imageUrl) ? imageUrl : undefined
  )
  const [status, setStatus] = useState<FigureImageStatus>(() => {
    if (!imageUrl) return "none"
    if (!isFigureImageIdbRef(imageUrl)) return "direct"
    return "loading"
  })

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    if (!imageUrl) {
      setSrc(undefined)
      setStatus("none")
      return
    }

    if (!isFigureImageIdbRef(imageUrl)) {
      setSrc(imageUrl)
      setStatus("direct")
      return
    }

    setSrc(undefined)
    setStatus("loading")
    ;(async () => {
      try {
        const url = await getFigureImageObjectUrl(imageUrl)
        if (cancelled) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        if (!url) {
          setSrc(undefined)
          setStatus("missing")
          return
        }
        objectUrl = url
        setSrc(url)
        setStatus("ready")
      } catch {
        if (!cancelled) {
          setSrc(undefined)
          setStatus("missing")
        }
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [imageUrl])

  return { src, status }
}
