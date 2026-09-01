"use client"

import {
  createArchive,
  deleteArchive,
  emptySnapshot,
  getArchive,
  listArchives,
  loadArchiveAutosave,
  moduleProgress,
  renameArchive,
  saveArchiveAutosave,
  saveSnapshotToArchive,
  summarizeArchive,
  type ResearchArchive,
  type ResearchSessionSnapshot,
  ARCHIVE_ACTIVE_KEY,
  ARCHIVE_COLLAPSE_KEY
} from "@/lib/research-archive"
import type { ResearchModuleId } from "@/lib/research-modules"
import { cn } from "@/lib/utils"
import {
  IconArchive,
  IconChevronLeft,
  IconChevronRight,
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
  IconPencil
} from "@tabler/icons-react"
import { FC, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

const AUTOSAVE_DEBOUNCE_MS = 1800

interface ArchiveSidebarProps {
  collapsed: boolean
  onCollapsedChange: (v: boolean) => void
  activeArchiveId: string | null
  onActiveArchiveChange: (id: string | null) => void
  captureSnapshot: () => ResearchSessionSnapshot
  applySnapshot: (snapshot: ResearchSessionSnapshot) => void
  activeModule: ResearchModuleId
  /** Bumps when any module session payload changes — drives autosave */
  sessionRevision: number
  /** False until active archive is hydrated from localStorage */
  archiveReady: boolean
}

export const ArchiveSidebar: FC<ArchiveSidebarProps> = ({
  collapsed,
  onCollapsedChange,
  activeArchiveId,
  onActiveArchiveChange,
  captureSnapshot,
  applySnapshot,
  activeModule,
  sessionRevision,
  archiveReady
}) => {
  const { t } = useTranslation()
  const [archives, setArchives] = useState<ResearchArchive[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [autosave, setAutosave] = useState(false)
  const [autosaveHint, setAutosaveHint] = useState<"idle" | "saving" | "saved">(
    "idle"
  )
  /** Increment to cancel pending/in-flight autosaves */
  const autosaveGen = useRef(0)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(() => {
    setArchives(listArchives())
  }, [])

  useEffect(() => {
    refresh()
    setAutosave(loadArchiveAutosave())
  }, [refresh])

  const pauseAutosave = useCallback(() => {
    autosaveGen.current += 1
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current)
      autosaveTimer.current = null
    }
    setAutosaveHint("idle")
  }, [])

  const persistAutosave = (enabled: boolean) => {
    setAutosave(enabled)
    saveArchiveAutosave(enabled)
    if (!enabled) pauseAutosave()
  }

  // Debounced autosave into the active archive
  useEffect(() => {
    if (!archiveReady || !autosave || !activeArchiveId) return

    const gen = autosaveGen.current
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setAutosaveHint("idle")
    autosaveTimer.current = setTimeout(async () => {
      if (gen !== autosaveGen.current) return
      setAutosaveHint("saving")
      try {
        const snap = captureSnapshot()
        if (gen !== autosaveGen.current) return
        const updated = await saveSnapshotToArchive(
          activeArchiveId,
          snap,
          activeModule
        )
        if (gen !== autosaveGen.current) return
        if (updated) {
          refresh()
          setAutosaveHint("saved")
          window.setTimeout(() => {
            if (gen === autosaveGen.current) setAutosaveHint("idle")
          }, 1600)
        } else {
          setAutosaveHint("idle")
        }
      } catch {
        if (gen === autosaveGen.current) setAutosaveHint("idle")
      }
    }, AUTOSAVE_DEBOUNCE_MS)

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [
    archiveReady,
    autosave,
    activeArchiveId,
    sessionRevision,
    captureSnapshot,
    activeModule,
    refresh
  ])

  const persistCollapse = (v: boolean) => {
    onCollapsedChange(v)
    try {
      localStorage.setItem(ARCHIVE_COLLAPSE_KEY, v ? "1" : "0")
    } catch {
      /* ignore */
    }
  }

  const setActive = (id: string | null) => {
    onActiveArchiveChange(id)
    try {
      if (id) localStorage.setItem(ARCHIVE_ACTIVE_KEY, id)
      else localStorage.removeItem(ARCHIVE_ACTIVE_KEY)
    } catch {
      /* ignore */
    }
  }

  const handleNew = async () => {
    const snap = captureSnapshot()
    const hasData = Boolean(
      snap.literatureReview ||
        snap.ideaCard ||
        snap.ideaCandidates.length ||
        snap.experimentRecord ||
        snap.writing?.current ||
        (snap.writing?.history?.length ?? 0) > 0 ||
        (snap.figures?.figures?.length ?? 0) > 0 ||
        Boolean(snap.review?.current)
    )

    try {
      if (hasData) {
        if (activeArchiveId) {
          await saveSnapshotToArchive(activeArchiveId, snap, activeModule)
        } else {
          await createArchive({ snapshot: snap, activeModule })
        }
      }

      const archive = await createArchive({ activeModule })
      pauseAutosave()
      applySnapshot(emptySnapshot())
      refresh()
      setActive(archive.id)
      toast.success(
        hasData
          ? t("research.archive.toastCreatedSaved")
          : t("research.archive.toastCreated")
      )
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : t("research.archive.toastMissing")
      )
    }
  }

  const handleSave = async () => {
    const snap = captureSnapshot()
    try {
      if (!activeArchiveId) {
        const archive = await createArchive({
          snapshot: snap,
          activeModule
        })
        pauseAutosave()
        refresh()
        setActive(archive.id)
        toast.success(t("research.archive.toastSaved"))
        return
      }
      const updated = await saveSnapshotToArchive(
        activeArchiveId,
        snap,
        activeModule
      )
      if (!updated) {
        toast.error(t("research.archive.toastMissing"))
        refresh()
        return
      }
      pauseAutosave()
      refresh()
      toast.success(t("research.archive.toastSaved"))
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : t("research.archive.toastMissing")
      )
    }
  }

  const handleLoad = (id: string) => {
    if (editingId) return
    const archive = getArchive(id)
    if (!archive) {
      toast.error(t("research.archive.toastMissing"))
      refresh()
      return
    }
    window.setTimeout(() => {
      pauseAutosave()
      applySnapshot(archive.snapshot)
      setActive(id)
      toast.success(t("research.archive.toastLoaded", { title: archive.title }))
    }, 0)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("research.archive.confirmDelete"))) return
    await deleteArchive(id)
    if (activeArchiveId === id) setActive(null)
    if (editingId === id) setEditingId(null)
    refresh()
    toast.success(t("research.archive.toastDeleted"))
  }

  const startRename = (archive: ResearchArchive) => {
    setEditingId(archive.id)
    setEditTitle(archive.title)
  }

  const commitRename = async () => {
    if (!editingId) return
    const id = editingId
    const title = editTitle.trim() || "Session"
    await renameArchive(id, title)
    setEditingId(null)
    window.setTimeout(() => refresh(), 0)
  }

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-r border-stone-200/90 bg-white/90 transition-[width] duration-300 ease-out dark:border-white/[0.06] dark:bg-[#0e1014]/95",
        collapsed ? "w-10" : "w-[240px]"
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col items-center py-3",
          collapsed ? "flex" : "hidden"
        )}
      >
        <button
          type="button"
          title={t("research.archive.expand")}
          onClick={() => persistCollapse(false)}
          className="flex size-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-teal-700 dark:text-white/45 dark:hover:bg-white/[0.06] dark:hover:text-teal-300"
        >
          <IconChevronRight size={18} />
        </button>
        <button
          type="button"
          title={t("research.archive.title")}
          onClick={() => persistCollapse(false)}
          className="mt-3 flex size-8 items-center justify-center rounded-lg text-teal-700 dark:text-teal-300"
        >
          <IconArchive size={18} />
        </button>
        <span className="mt-2 text-[9px] font-medium uppercase tracking-[0.16em] text-stone-400 [writing-mode:vertical-rl]">
          {t("research.archive.short")}
        </span>
      </div>

      <div
        className={cn(
          "flex h-full min-w-[240px] flex-col",
          collapsed ? "hidden" : "flex"
        )}
      >
        <div className="flex items-center gap-1.5 border-b border-stone-100 px-2.5 py-2.5 dark:border-white/[0.05]">
          <IconArchive size={16} className="text-teal-700 dark:text-teal-300" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-stone-800 dark:text-white/85">
              {t("research.archive.title")}
            </p>
            <p className="text-[9px] text-stone-400">
              {t("research.archive.subtitle")}
            </p>
          </div>
          <button
            type="button"
            title={t("research.archive.collapse")}
            onClick={() => persistCollapse(true)}
            className="flex size-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-white/[0.06] dark:hover:text-white/70"
          >
            <IconChevronLeft size={16} />
          </button>
        </div>

        <div className="flex gap-1.5 border-b border-stone-100 p-2 dark:border-white/[0.05]">
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-stone-200 text-[11px] font-medium text-stone-600 hover:bg-stone-50 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/[0.04]"
          >
            <IconPlus size={13} />
            {t("research.archive.new")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-stone-900 text-[11px] font-medium text-white dark:bg-teal-500 dark:text-stone-950"
          >
            <IconDeviceFloppy size={13} />
            {t("research.archive.save")}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-2.5 py-2 dark:border-white/[0.05]">
          <span className="min-w-0 flex-1 pr-2">
            <span className="block text-[11px] font-medium text-stone-700 dark:text-white/75">
              {t("research.archive.autosave", { defaultValue: "Auto-save" })}
            </span>
            <span className="block text-[9px] leading-snug text-stone-400">
              {!autosave
                ? t("research.archive.autosaveOff", {
                    defaultValue: "Manual save only"
                  })
                : !activeArchiveId
                  ? t("research.archive.autosaveNeedActive", {
                      defaultValue: "Select or save an archive first"
                    })
                  : autosaveHint === "saving"
                    ? t("research.archive.autosaveSaving", {
                        defaultValue: "Saving…"
                      })
                    : autosaveHint === "saved"
                      ? t("research.archive.autosaveSaved", {
                          defaultValue: "Auto-saved"
                        })
                      : t("research.archive.autosaveOn", {
                          defaultValue:
                            "Writes to the selected archive after edits"
                        })}
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={autosave}
            aria-label={t("research.archive.autosave", {
              defaultValue: "Auto-save"
            })}
            onClick={() => persistAutosave(!autosave)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
              autosave
                ? "bg-teal-600 dark:bg-teal-500"
                : "bg-stone-300 dark:bg-white/20"
            )}
          >
            <span
              className={cn(
                "block size-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                autosave ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {archives.length === 0 ? (
            <p className="px-1 py-6 text-center text-[11px] leading-relaxed text-stone-400">
              {t("research.archive.empty")}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {archives.map(archive => {
                const active = archive.id === activeArchiveId
                const progress = summarizeArchive(archive)
                const dots = moduleProgress(archive.snapshot)
                return (
                  <li
                    key={archive.id}
                    className={cn(
                      "rounded-xl border p-2 transition",
                      active
                        ? "border-teal-600/35 bg-teal-700/[0.07] dark:border-teal-400/30 dark:bg-teal-400/10"
                        : "border-stone-200/80 bg-white hover:border-stone-300 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/12"
                    )}
                  >
                    {editingId === archive.id ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            ;(e.target as HTMLInputElement).blur()
                          }
                          if (e.key === "Escape") setEditingId(null)
                        }}
                        className="mb-1.5 w-full rounded-lg border border-stone-200 bg-[#fafaf8] px-2 py-1 text-[11px] outline-none focus:ring-2 focus:ring-teal-700/25 dark:border-white/10 dark:bg-black/20 dark:text-white/85"
                      />
                    ) : (
                      <div
                        onClick={() => handleLoad(archive.id)}
                        className="w-full cursor-pointer text-left"
                      >
                        <span className="block truncate text-[12px] font-medium text-stone-800 dark:text-white/85">
                          {archive.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[9px] text-stone-400">
                          <span>{progress}</span>
                          <span>·</span>
                          <span>
                            {new Date(archive.updatedAt).toLocaleString()}
                          </span>
                        </span>
                        <span className="mt-1.5 flex flex-wrap gap-0.5">
                          {dots.map(d => (
                            <span
                              key={d.id}
                              title={d.id}
                              className={cn(
                                "inline-block size-1.5 rounded-full",
                                d.ready
                                  ? "bg-teal-500"
                                  : "bg-stone-200 dark:bg-white/15"
                              )}
                            />
                          ))}
                        </span>
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        title={t("research.archive.rename")}
                        onClick={() => startRename(archive)}
                        className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-white/5 dark:hover:text-white/70"
                      >
                        <IconPencil size={12} />
                      </button>
                      <button
                        type="button"
                        title={t("research.archive.delete")}
                        onClick={() => handleDelete(archive.id)}
                        className="rounded-md p-1 text-stone-400 hover:bg-rose-500/10 hover:text-rose-500"
                      >
                        <IconTrash size={12} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  )
}
