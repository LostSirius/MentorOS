import type { WritingBundle } from "@/lib/writing-types"

type WritingFlushFn = () => WritingBundle | null | undefined

let flushFn: WritingFlushFn | null = null

/** Writing / Polish pages register so Archive can flush editor prose before snapshot. */
export function registerWritingProseFlush(fn: WritingFlushFn | null) {
  flushFn = fn
}

/** Sync local editor prose into the session; returns flushed bundle when available. */
export function flushWritingProseForSnapshot(): WritingBundle | null {
  if (!flushFn) return null
  try {
    return flushFn() ?? null
  } catch {
    return null
  }
}
