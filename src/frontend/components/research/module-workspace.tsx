"use client"

import { CopilotContext } from "@/context/copilot-context"
import {
  ARCHIVE_ACTIVE_KEY,
  ARCHIVE_COLLAPSE_KEY,
  ensureResearchArchiveStorageMigrated,
  getArchive,
  type ResearchSessionSnapshot
} from "@/lib/research-archive"
import {
  DEFAULT_RESEARCH_MODULE,
  ResearchModuleId
} from "@/lib/research-modules"
import { normalizeFigureSession } from "@/lib/figure-types"
import {
  buildOverviewState,
  isOverviewState
} from "@/lib/overview-types"
import { normalizeReviewSession } from "@/lib/review-types"
import {
  emptyWritingSession,
  normalizeWritingSession
} from "@/lib/writing-types"
import { flushWritingProseForSnapshot } from "@/lib/writing-prose-flush"
import { cn } from "@/lib/utils"
import {
  FC,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react"
import { ArchiveSidebar } from "./archive-sidebar"
import { ExperimentResearchPage } from "./experiment-research-page"
import { FiguresResearchPage } from "./figures-research-page"
import { IdeaResearchPage } from "./idea-research-page"
import { LiteratureResearchPage } from "./literature-research-page"
import { ModuleNav } from "./module-nav"
import { OverviewResearchPage } from "./overview-research-page"
import { PolishResearchPage } from "./polish-research-page"
import { ReviewResearchPage } from "./review-research-page"
import { WritingResearchPage } from "./writing-research-page"

export const ModuleWorkspace: FC = () => {
  const [active, setActive] = useState<ResearchModuleId>(DEFAULT_RESEARCH_MODULE)
  const [archiveCollapsed, setArchiveCollapsed] = useState(false)
  const [activeArchiveId, setActiveArchiveId] = useState<string | null>(null)
  const [sessionRevision, setSessionRevision] = useState(0)
  /** False until LS hydrate finishes — blocks autosave from wiping archives */
  const [archiveReady, setArchiveReady] = useState(false)
  /** Keep-alive visited modules (except mutual writing/polish — only one hook at a time). */
  const [mounted, setMounted] = useState<Set<ResearchModuleId>>(
    () => new Set([DEFAULT_RESEARCH_MODULE])
  )
  const [overviewNotes, setOverviewNotes] = useState("")

  const {
    literatureReview,
    setLiteratureReview,
    ideaCandidates,
    setIdeaCandidates,
    ideaCard,
    setIdeaCard,
    experimentRecord,
    setExperimentRecord,
    writingSession,
    setWritingSession,
    figureSession,
    setFigureSession,
    reviewSession,
    setReviewSession,
    setLiteratureReviewError,
    setIdeaError,
    setExperimentError,
    setWritingError,
    setFiguresError,
    setReviewError,
    setWritingLoading,
    setFiguresLoading,
    setReviewLoading,
    setLiteratureReviewLoading,
    setIdeaLoading,
    setExperimentLoading
  } = useContext(CopilotContext)

  // Drive archive autosave when any module session payload changes
  useEffect(() => {
    if (!archiveReady) return
    setSessionRevision(n => n + 1)
  }, [
    archiveReady,
    literatureReview,
    ideaCandidates,
    ideaCard,
    experimentRecord,
    writingSession,
    figureSession,
    reviewSession,
    overviewNotes
  ])

  const selectModule = useCallback((id: ResearchModuleId) => {
    startTransition(() => {
      setMounted(prev => {
        const next = new Set(prev)
        next.add(id)
        // Writing and Polish both own useWritingWorkspace — never keep both alive.
        if (id === "writing") next.delete("polish")
        if (id === "polish") next.delete("writing")
        return next
      })
      setActive(id)
    })
  }, [])

  const captureSnapshot = useCallback((): ResearchSessionSnapshot => {
    const flushed = flushWritingProseForSnapshot()
    const writingForSnap =
      flushed != null
        ? {
            ...(writingSession || emptyWritingSession()),
            current: flushed
          }
        : writingSession

    const overview = buildOverviewState({
      literatureReview,
      ideaCard,
      ideaCandidatesCount: ideaCandidates?.length || 0,
      experimentRecord,
      writingSession: writingForSnap,
      figureSession,
      reviewSession,
      notes: overviewNotes
    })
    return {
      literatureReview,
      ideaCandidates,
      ideaCard,
      experimentRecord,
      writing: writingForSnap,
      figures: figureSession,
      review: reviewSession,
      overview
    }
  }, [
    literatureReview,
    ideaCandidates,
    ideaCard,
    experimentRecord,
    writingSession,
    figureSession,
    reviewSession,
    overviewNotes
  ])

  const applySnapshot = useCallback(
    (snapshot: ResearchSessionSnapshot) => {
      setLiteratureReview(snapshot.literatureReview ?? null)
      setIdeaCandidates(snapshot.ideaCandidates ?? [])
      setIdeaCard(snapshot.ideaCard ?? null)
      setExperimentRecord(snapshot.experimentRecord ?? null)
      setWritingSession(
        snapshot.writing
          ? normalizeWritingSession(snapshot.writing)
          : null
      )
      setFigureSession(
        snapshot.figures
          ? normalizeFigureSession(snapshot.figures)
          : null
      )
      setReviewSession(
        snapshot.review
          ? normalizeReviewSession(snapshot.review)
          : null
      )
      setOverviewNotes(
        isOverviewState(snapshot.overview)
          ? snapshot.overview.notes || ""
          : ""
      )
      setLiteratureReviewError(null)
      setIdeaError(null)
      setExperimentError(null)
      setWritingError(null)
      setFiguresError(null)
      setReviewError(null)
      setLiteratureReviewLoading(false)
      setIdeaLoading(false)
      setExperimentLoading(false)
      setWritingLoading(false)
      setFiguresLoading(false)
      setReviewLoading(false)
    },
    [
      setLiteratureReview,
      setIdeaCandidates,
      setIdeaCard,
      setExperimentRecord,
      setWritingSession,
      setFigureSession,
      setReviewSession,
      setLiteratureReviewError,
      setIdeaError,
      setExperimentError,
      setWritingError,
      setFiguresError,
      setReviewError,
      setLiteratureReviewLoading,
      setIdeaLoading,
      setExperimentLoading,
      setWritingLoading,
      setFiguresLoading,
      setReviewLoading
    ]
  )

  // Restore collapse + hydrate active archive before enabling autosave
  useEffect(() => {
    try {
      ensureResearchArchiveStorageMigrated()
      setArchiveCollapsed(localStorage.getItem(ARCHIVE_COLLAPSE_KEY) === "1")
      const id = localStorage.getItem(ARCHIVE_ACTIVE_KEY)
      if (id) {
        const archive = getArchive(id)
        if (archive) {
          applySnapshot(archive.snapshot)
          setActiveArchiveId(id)
          if (archive.activeModule) {
            startTransition(() => {
              setMounted(prev => {
                const next = new Set(prev)
                next.add(archive.activeModule!)
                if (archive.activeModule === "writing") next.delete("polish")
                if (archive.activeModule === "polish") next.delete("writing")
                return next
              })
              setActive(archive.activeModule!)
            })
          }
        } else {
          localStorage.removeItem(ARCHIVE_ACTIVE_KEY)
          setActiveArchiveId(null)
        }
      }
    } catch {
      /* ignore */
    } finally {
      setArchiveReady(true)
    }
  }, [applySnapshot])

  const show = (id: ResearchModuleId) =>
    mounted.has(id) ? (active === id ? "block" : "hidden") : "hidden"

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden">
      <ModuleNav active={active} onSelect={selectModule} />

      <ArchiveSidebar
        collapsed={archiveCollapsed}
        onCollapsedChange={setArchiveCollapsed}
        activeArchiveId={activeArchiveId}
        onActiveArchiveChange={setActiveArchiveId}
        captureSnapshot={captureSnapshot}
        applySnapshot={applySnapshot}
        activeModule={active}
        sessionRevision={sessionRevision}
        archiveReady={archiveReady}
      />

      <div className="relative min-w-0 flex-1 overflow-hidden">
        {mounted.has("overview") ? (
          <div className={cn("h-full", show("overview"))}>
            <OverviewResearchPage
              onNavigate={selectModule}
              notes={overviewNotes}
              onNotesChange={setOverviewNotes}
            />
          </div>
        ) : null}
        {mounted.has("literature") ? (
          <div className={cn("h-full", show("literature"))}>
            <LiteratureResearchPage />
          </div>
        ) : null}
        {mounted.has("idea") ? (
          <div className={cn("h-full", show("idea"))}>
            <IdeaResearchPage />
          </div>
        ) : null}
        {mounted.has("experiment") ? (
          <div className={cn("h-full", show("experiment"))}>
            <ExperimentResearchPage />
          </div>
        ) : null}
        {mounted.has("writing") ? (
          <div className={cn("h-full", show("writing"))}>
            <WritingResearchPage />
          </div>
        ) : null}
        {mounted.has("figures") ? (
          <div className={cn("h-full", show("figures"))}>
            <FiguresResearchPage />
          </div>
        ) : null}
        {mounted.has("review") ? (
          <div className={cn("h-full", show("review"))}>
            <ReviewResearchPage />
          </div>
        ) : null}
        {mounted.has("polish") ? (
          <div className={cn("h-full", show("polish"))}>
            <PolishResearchPage />
          </div>
        ) : null}
      </div>
    </div>
  )
}
