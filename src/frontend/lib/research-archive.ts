/**
 * Session archive: persist an entire research conversation
 * (all module payloads) to localStorage.
 * AI figure images use IndexedDB refs (idb:figure-img:…) — not data URLs.
 */

import type { LiteratureReviewResult } from "@/context/copilot-context"
import type { ExperimentRecord } from "@/lib/experiment-types"
import {
  collectFigureImageKeys,
  deleteFigureImages,
  figureImageIdbKey,
  isFigureImageIdbRef,
  mimeFromDataUrl,
  putFigureImageFromDataUrl,
  toFigureImageIdbRef
} from "@/lib/figure-image-store"
import type { FigureSession } from "@/lib/figure-types"
import type { IdeaCandidate, IdeaCard } from "@/lib/idea-types"
import type { OverviewState } from "@/lib/overview-types"
import {
  RESEARCH_MODULES,
  type ResearchModuleId
} from "@/lib/research-modules"
import type { ReviewSession } from "@/lib/review-types"
import type { WritingSession } from "@/lib/writing-types"
import { migrateMentorOsStorageKeys } from "@/lib/migrate-storage-keys"

export const ARCHIVE_STORAGE_KEY = "mentoros-archives-v1"
export const ARCHIVE_COLLAPSE_KEY = "mentoros-archive-collapsed"
export const ARCHIVE_ACTIVE_KEY = "mentoros-archive-active-id"
export const ARCHIVE_AUTOSAVE_KEY = "mentoros-archive-autosave"

const ARCHIVE_KEY_MIGRATIONS: Array<[string, string]> = [
  ["scholar-canvas-archives-v1", ARCHIVE_STORAGE_KEY],
  ["scholar-canvas-archive-collapsed", ARCHIVE_COLLAPSE_KEY],
  ["scholar-canvas-archive-active-id", ARCHIVE_ACTIVE_KEY],
  ["scholar-canvas-archive-autosave", ARCHIVE_AUTOSAVE_KEY]
]

function ensureArchiveKeysMigrated() {
  migrateMentorOsStorageKeys(ARCHIVE_KEY_MIGRATIONS)
}

/** Call before reading archive keys outside listArchives / loadArchiveAutosave. */
export function ensureResearchArchiveStorageMigrated() {
  if (typeof window === "undefined") return
  ensureArchiveKeysMigrated()
}

export function loadArchiveAutosave(): boolean {
  if (typeof window === "undefined") return false
  try {
    ensureArchiveKeysMigrated()
    return localStorage.getItem(ARCHIVE_AUTOSAVE_KEY) === "1"
  } catch {
    return false
  }
}

export function saveArchiveAutosave(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(ARCHIVE_AUTOSAVE_KEY, enabled ? "1" : "0")
  } catch {
    /* ignore */
  }
}

export type ResearchSessionSnapshot = {
  literatureReview: LiteratureReviewResult | null
  ideaCandidates: IdeaCandidate[]
  ideaCard: IdeaCard | null
  experimentRecord: ExperimentRecord | null
  writing: WritingSession | null
  figures: FigureSession | null
  review: ReviewSession | null
  /** Aggregated Material Passport; rebuilt on save from live modules. */
  overview: OverviewState | null
}

export type ResearchArchive = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  activeModule?: ResearchModuleId
  snapshot: ResearchSessionSnapshot
}

export function emptySnapshot(): ResearchSessionSnapshot {
  return {
    literatureReview: null,
    ideaCandidates: [],
    ideaCard: null,
    experimentRecord: null,
    writing: null,
    figures: null,
    review: null,
    overview: null
  }
}

export function listArchives(): ResearchArchive[] {
  if (typeof window === "undefined") return []
  try {
    ensureArchiveKeysMigrated()
    const raw = localStorage.getItem(ARCHIVE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ResearchArchive[]) : []
  } catch {
    return []
  }
}

function writeArchives(list: ResearchArchive[]) {
  const payload = JSON.stringify(list)
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, payload)
  } catch (err) {
    // Last resort: drop any leftover data: URLs (should already be idb refs)
    const slim = list.map(a => ({
      ...a,
      snapshot: {
        ...a.snapshot,
        figures: stripDataUrlsOnly(a.snapshot.figures)
      }
    }))
    try {
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(slim))
    } catch {
      throw err
    }
  }
}

function stripDataUrlsOnly(session: FigureSession | null): FigureSession | null {
  if (!session) return null
  return {
    ...session,
    figures: session.figures.map(fig => {
      const url = fig.imageUrl || ""
      if (!url.startsWith("data:")) return fig
      const note =
        fig.locale === "zh"
          ? "（存档未能写入 IndexedDB，已省略 AI 生图 data URL。）"
          : "(Could not persist image to IndexedDB; data URL omitted from archive.)"
      return {
        ...fig,
        imageUrl: undefined,
        imageMime: undefined,
        layoutNotes: `${fig.layoutNotes || ""}\n\n${note}`.trim()
      }
    })
  }
}

/**
 * Move bulky data: image URLs into IndexedDB; keep http(s) and idb: refs as-is.
 */
export async function persistFiguresForStorage(
  session: FigureSession | null
): Promise<FigureSession | null> {
  if (!session) return null
  const figures = await Promise.all(
    session.figures.map(async fig => {
      const url = fig.imageUrl || ""
      if (!url.startsWith("data:")) return fig
      try {
        const key = await putFigureImageFromDataUrl(url, fig.imageMime)
        return {
          ...fig,
          imageUrl: toFigureImageIdbRef(key),
          imageMime: fig.imageMime || mimeFromDataUrl(url)
        }
      } catch {
        const note =
          fig.locale === "zh"
            ? "（存档未能写入 IndexedDB，已省略 AI 生图 data URL。）"
            : "(Could not persist image to IndexedDB; data URL omitted from archive.)"
        return {
          ...fig,
          imageUrl: undefined,
          imageMime: undefined,
          layoutNotes: `${fig.layoutNotes || ""}\n\n${note}`.trim()
        }
      }
    })
  )
  return { ...session, figures }
}

export async function persistSnapshotForStorage(
  snapshot: ResearchSessionSnapshot
): Promise<ResearchSessionSnapshot> {
  return {
    ...snapshot,
    figures: await persistFiguresForStorage(snapshot.figures)
  }
}

/** @deprecated Prefer persistFiguresForStorage — kept for sync fallback paths */
export function sanitizeFiguresForStorage(
  session: FigureSession | null
): FigureSession | null {
  return stripDataUrlsOnly(session)
}

export function sanitizeSnapshotForStorage(
  snapshot: ResearchSessionSnapshot
): ResearchSessionSnapshot {
  return {
    ...snapshot,
    figures: stripDataUrlsOnly(snapshot.figures)
  }
}

export function getArchive(id: string): ResearchArchive | null {
  return listArchives().find(a => a.id === id) || null
}

export async function createArchive(partial?: {
  title?: string
  snapshot?: ResearchSessionSnapshot
  activeModule?: ResearchModuleId
}): Promise<ResearchArchive> {
  const now = new Date().toISOString()
  const snapshot = await persistSnapshotForStorage(
    partial?.snapshot || emptySnapshot()
  )
  const archive: ResearchArchive = {
    id: `arc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    title: partial?.title?.trim() || defaultTitle(),
    createdAt: now,
    updatedAt: now,
    activeModule: partial?.activeModule,
    snapshot
  }
  const list = [archive, ...listArchives()]
  writeArchives(list)
  return archive
}

export async function updateArchive(
  id: string,
  patch: Partial<Pick<ResearchArchive, "title" | "activeModule" | "snapshot">>
): Promise<ResearchArchive | null> {
  const list = listArchives()
  const idx = list.findIndex(a => a.id === id)
  if (idx < 0) return null

  const prev = list[idx]
  let snapshot = prev.snapshot
  if (patch.snapshot) {
    snapshot = await persistSnapshotForStorage(patch.snapshot)
    const oldKeys = collectFigureImageKeys(prev.snapshot.figures)
    const newKeys = new Set(collectFigureImageKeys(snapshot.figures))
    const orphans = oldKeys.filter(k => !newKeys.has(k))
    if (orphans.length) {
      try {
        await deleteFigureImages(orphans)
      } catch {
        /* ignore GC errors */
      }
    }
  }

  const next: ResearchArchive = {
    ...prev,
    ...patch,
    title: patch.title?.trim() || prev.title,
    snapshot,
    updatedAt: new Date().toISOString()
  }
  list[idx] = next
  writeArchives(list)
  return next
}

export async function deleteArchive(id: string): Promise<void> {
  const archive = getArchive(id)
  if (archive) {
    try {
      await deleteFigureImages(collectFigureImageKeys(archive.snapshot.figures))
    } catch {
      /* ignore */
    }
  }
  writeArchives(listArchives().filter(a => a.id !== id))
  if (typeof window !== "undefined") {
    if (localStorage.getItem(ARCHIVE_ACTIVE_KEY) === id) {
      localStorage.removeItem(ARCHIVE_ACTIVE_KEY)
    }
  }
}

export async function renameArchive(
  id: string,
  title: string
): Promise<ResearchArchive | null> {
  return updateArchive(id, { title })
}

export async function saveSnapshotToArchive(
  id: string,
  snapshot: ResearchSessionSnapshot,
  activeModule?: ResearchModuleId
): Promise<ResearchArchive | null> {
  return updateArchive(id, { snapshot, activeModule })
}

/**
 * After image gen: store data URL in IndexedDB and return an idb: ref for session state.
 * Keeps http(s) / existing idb: refs unchanged.
 */
export async function persistSessionFigureImage(
  imageUrl: string | undefined,
  imageMime?: string,
  previousImageUrl?: string
): Promise<{ imageUrl?: string; imageMime?: string }> {
  if (!imageUrl) return { imageUrl, imageMime }

  if (isFigureImageIdbRef(imageUrl) || !imageUrl.startsWith("data:")) {
    return { imageUrl, imageMime }
  }

  const prevKey = figureImageIdbKey(previousImageUrl)
  try {
    const key = await putFigureImageFromDataUrl(imageUrl, imageMime)
    if (prevKey && prevKey !== key) {
      try {
        await deleteFigureImages([prevKey])
      } catch {
        /* ignore */
      }
    }
    return {
      imageUrl: toFigureImageIdbRef(key),
      imageMime: imageMime || mimeFromDataUrl(imageUrl)
    }
  } catch {
    // Keep data URL in-memory; archive save will retry IDB
    return { imageUrl, imageMime }
  }
}

function defaultTitle(): string {
  const d = new Date()
  const stamp = d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
  return `Session ${stamp}`
}

function writingHasPolishMode(session: WritingSession | null): boolean {
  if (!session) return false
  const modes = [
    session.current?.mode,
    ...(session.history || []).map(h => h.bundle?.mode)
  ]
  return modes.some(
    m =>
      m === "polish" ||
      m === "revise_feedback" ||
      m === "revise_scoped"
  )
}

export function moduleProgress(snapshot: ResearchSessionSnapshot): {
  id: ResearchModuleId
  ready: boolean
}[] {
  const writingReady = Boolean(
    snapshot.writing?.current || snapshot.writing?.history?.length
  )
  const readyById: Record<ResearchModuleId, boolean> = {
    overview: Boolean(
      snapshot.overview &&
        Array.isArray(snapshot.overview.passport) &&
        snapshot.overview.passport.length > 0
    ),
    literature: Boolean(snapshot.literatureReview),
    idea: Boolean(snapshot.ideaCard || snapshot.ideaCandidates.length),
    experiment: Boolean(snapshot.experimentRecord),
    writing: writingReady,
    figures: Boolean(snapshot.figures?.figures?.length),
    review: Boolean(snapshot.review?.current),
    polish: writingHasPolishMode(snapshot.writing)
  }
  // Match left-nav order in RESEARCH_MODULES
  return RESEARCH_MODULES.map(m => ({
    id: m.id,
    ready: readyById[m.id]
  }))
}

export function summarizeArchive(archive: ResearchArchive): string {
  const mods = moduleProgress(archive.snapshot)
  const ready = mods.filter(m => m.ready).length
  return `${ready}/${mods.length}`
}
