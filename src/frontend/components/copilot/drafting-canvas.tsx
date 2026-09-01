"use client"

import { ChatbotUIContext } from "@/context/context"
import { CopilotContext } from "@/context/copilot-context"
import {
  generateDraft,
  resolveModelProvider
} from "@/lib/copilot-generator"
import { motion, AnimatePresence } from "framer-motion"
import {
  IconAlertCircle,
  IconBulb,
  IconThumbUp,
  IconSparkles
} from "@tabler/icons-react"
import { FC, useContext, useRef, useCallback, useEffect, useState } from "react"
import { SelectionPopover } from "./selection-popover"

const CRITIQUE_ICONS = {
  suggestion: IconBulb,
  issue: IconAlertCircle,
  praise: IconThumbUp
}

const CRITIQUE_COLORS = {
  suggestion: "border-amber-500/30 bg-amber-500/5 text-amber-300",
  issue: "border-rose-500/30 bg-rose-500/5 text-rose-300",
  praise: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
}

const HIGHLIGHT_COLORS = {
  suggestion: "ring-amber-500/40 bg-amber-500/10",
  issue: "ring-rose-500/40 bg-rose-500/10",
  praise: "ring-emerald-500/40 bg-emerald-500/10"
}

interface GeneratedCritique {
  id: string
  paragraphIndex: number
  text: string
  type: "suggestion" | "issue" | "praise"
}

export const DraftingCanvas: FC = () => {
  const {
    currentIdea,
    activeHighlight,
    setActiveHighlight,
    selectedText,
    setSelectedText,
    selectionPosition,
    setSelectionPosition,
    apiKey
  } = useContext(CopilotContext)

  const { chatSettings, models, availableHostedModels, availableLocalModels, availableOpenRouterModels } =
    useContext(ChatbotUIContext)

  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([])
  const canvasRef = useRef<HTMLDivElement>(null)
  const [paragraphs, setParagraphs] = useState<string[]>([])
  const [critiques, setLocalCritiques] = useState<GeneratedCritique[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [peerReview, setPeerReview] = useState<string | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)

  function fallbackDraft(idea: string) {
    const core = idea.trim()
    const sentences = core.split(/[.!?。！？]+/).filter(s => s.trim().length > 0)
    const firstSentence = sentences[0] || core
    const topic = firstSentence.length > 80 ? firstSentence.slice(0, 80) + "..." : firstSentence

    return {
      paragraphs: [
        `Recent advances in the field have highlighted the growing importance of ${topic.toLowerCase()}. However, existing approaches remain limited in scope and fail to address critical bottlenecks that hinder practical deployment and scalability.`,
        `In this paper, we propose a novel framework that systematically addresses ${topic.toLowerCase()}. Our approach decomposes the problem into modular, reusable components, each encapsulating domain-specific expertise and guiding structured reasoning through well-defined pipelines.`,
        `We ground our methodology in established theoretical frameworks, translating existing tacit knowledge into explicit, reproducible interaction patterns. The proposed framework supports seamless integration across multiple stages of the research lifecycle, from ideation to validation.`,
        `We evaluate our approach through comprehensive experiments. Quantitative results demonstrate significant improvements over baseline methods, while qualitative analyses reveal the framework's ability to scaffold complex tasks and accelerate research workflows.`,
        `The contributions of this work are threefold: (1) a formalization of the problem space as composable primitives, (2) an open-source implementation with an extensible architecture, and (3) empirical evidence demonstrating the efficacy of the proposed approach in real-world settings.`
      ],
      critiques: [
        { id: "c1", paragraphIndex: 0, text: "The opening sentence is broad. Consider adding specific citations or recent surveys to ground the claim.", type: "suggestion" as const },
        { id: "c2", paragraphIndex: 1, text: "Strong structural framing — decomposing into modular components is a clear and defensible contribution pattern.", type: "praise" as const },
        { id: "c3", paragraphIndex: 3, text: "The evaluation plan lacks specific metrics and dataset names. Define baselines and significance tests before drafting.", type: "issue" as const },
        { id: "c4", paragraphIndex: 2, text: "Consider citing 2-3 seminal works that directly motivate the theoretical grounding claimed here.", type: "suggestion" as const }
      ]
    }
  }

  useEffect(() => {
    if (!currentIdea.trim() || !chatSettings) {
      setParagraphs([
        "Start a conversation with your research idea. The drafting canvas will automatically generate an introduction draft based on your input.",
        "Once an idea is detected, this section will outline the proposed methodology and key technical contributions.",
        "Theoretical grounding and connections to existing literature will appear here.",
        "Evaluation plans and expected experimental results will be structured in this paragraph.",
        "A summary of contributions and their significance will conclude the draft."
      ])
      setLocalCritiques([])
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const { provider, customModelId } = resolveModelProvider(
      chatSettings.model,
      models,
      availableHostedModels,
      availableLocalModels,
      availableOpenRouterModels
    )

    generateDraft(currentIdea, chatSettings, provider, customModelId, apiKey)
      .then(result => {
        if (cancelled) return
        if (result.paragraphs.length === 0) {
          const fallback = fallbackDraft(currentIdea)
          setParagraphs(fallback.paragraphs)
          setLocalCritiques(fallback.critiques)
          setError("AI returned empty output. Using template fallback.")
        } else {
          setParagraphs(result.paragraphs)
          setLocalCritiques(result.critiques)
        }
        setActiveHighlight(null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        const fallback = fallbackDraft(currentIdea)
        setParagraphs(fallback.paragraphs)
        setLocalCritiques(fallback.critiques)
        setError(err.message || "AI generation failed. Using template fallback.")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentIdea, chatSettings])

  const scrollToHighlight = useCallback(
    (paragraphIndex: number) => {
      const ref = paragraphRefs.current[paragraphIndex]
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    },
    []
  )

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectedText("")
      setSelectionPosition(null)
      return
    }

    const text = selection.toString().trim()
    if (text.length < 3) return

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const canvasRect = canvasRef.current?.getBoundingClientRect()

    if (canvasRect) {
      setSelectedText(text)
      setSelectionPosition({
        x: rect.left - canvasRect.left + rect.width / 2,
        y: rect.top - canvasRect.top - 10
      })
    }
  }, [setSelectedText, setSelectionPosition])

  const runPeerReview = useCallback(async () => {
    if (!chatSettings || paragraphs.length === 0 || isReviewing) return
    setIsReviewing(true)
    try {
      const { provider } = resolveModelProvider(
        chatSettings.model,
        models,
        availableHostedModels,
        availableLocalModels,
        availableOpenRouterModels
      )
      const res = await fetch("/api/scientific-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatSettings,
          provider,
          paper: {
            title: currentIdea.slice(0, 120) || "Untitled draft",
            abstract: paragraphs[0] || "",
            mainContent: paragraphs.join("\n\n")
          }
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setPeerReview(data.review || "")
    } catch (err: any) {
      setError(err.message || "Peer review failed")
    } finally {
      setIsReviewing(false)
    }
  }, [
    chatSettings,
    paragraphs,
    isReviewing,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels,
    currentIdea
  ])

  return (
    <div className="flex h-full gap-4">
      <div
        ref={canvasRef}
        className="relative flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.02]"
        onMouseUp={handleTextSelection}
      >
        <div className="mb-6 flex items-center gap-2">
          <IconSparkles size={18} className="text-violet-400" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Introduction Draft
          </h2>
          <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
            {isLoading ? "Generating..." : "AI-Assisted"}
          </span>
          <button
            type="button"
            disabled={isLoading || isReviewing || paragraphs.length === 0}
            onClick={runPeerReview}
            className="ml-auto rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/5"
          >
            {isReviewing ? "Reviewing…" : "Peer-review draft"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex h-40 flex-col items-center justify-center text-gray-400 dark:text-white/30">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mb-3 size-6 rounded-full border-2 border-violet-500/30 border-t-violet-400"
              />
              <p className="text-sm">Generating introduction draft with your selected model...</p>
            </div>
          ) : (
            paragraphs.map((para, index) => {
              const critique = critiques.find(c => c.paragraphIndex === index)
              const isHighlighted = critique && activeHighlight === critique.id

              return (
                <motion.div
                  key={index}
                  ref={el => {
                    paragraphRefs.current[index] = el
                  }}
                  layout
                  className={`relative rounded-lg p-4 transition-all duration-500 ${
                    isHighlighted
                      ? `ring-2 ${HIGHLIGHT_COLORS[critique.type]}`
                      : "hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  }`}
                >
                  {isHighlighted && (
                    <motion.div
                      className="absolute -left-2 inset-y-0 w-1 rounded-full"
                      style={{
                        backgroundColor:
                          critique.type === "suggestion"
                            ? "rgba(245,158,11,0.6)"
                            : critique.type === "issue"
                              ? "rgba(244,63,94,0.6)"
                              : "rgba(16,185,129,0.6)"
                      }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}

                  <p className="leading-relaxed text-gray-700 selection:bg-violet-500/30 dark:text-white/70">
                    <span className="mr-2 font-mono text-xs text-gray-300 dark:text-white/20">
                      [{index + 1}]
                    </span>
                    {para}
                  </p>

                  {critique && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-white/30">
                      {(() => {
                        const CIcon = CRITIQUE_ICONS[critique.type]
                        return <CIcon size={12} />
                      })()}
                      <span>Feedback available</span>
                    </div>
                  )}
                </motion.div>
              )
            })
          )}
        </div>

        <AnimatePresence>
          {selectionPosition && selectedText && (
            <SelectionPopover
              x={selectionPosition.x}
              y={selectionPosition.y}
              selectedText={selectedText}
              onClose={() => {
                setSelectedText("")
                setSelectionPosition(null)
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="w-72 shrink-0 space-y-3 overflow-y-auto">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-white/40">
          Critique Panel
        </div>

        {peerReview && (
          <div className="rounded-lg border border-sky-500/25 bg-sky-500/5 p-3">
            <div className="mb-1 text-xs font-medium text-sky-300">
              Review outline
            </div>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-gray-600 dark:text-white/65">
              {peerReview}
            </pre>
          </div>
        )}

        {critiques.map(critique => {
          const CIcon = CRITIQUE_ICONS[critique.type]
          const isActive = activeHighlight === critique.id

          return (
            <motion.div
              key={critique.id}
              className={`cursor-pointer rounded-lg border p-3 transition-all duration-200 ${
                isActive
                  ? CRITIQUE_COLORS[critique.type] + " shadow-lg"
                  : "border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/10"
              }`}
              onMouseEnter={() => {
                setActiveHighlight(critique.id)
                scrollToHighlight(critique.paragraphIndex)
              }}
              onMouseLeave={() => setActiveHighlight(null)}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <div className="mb-1 flex items-center gap-2">
                <CIcon size={14} />
                <span className="text-xs font-medium capitalize">
                  {critique.type}
                </span>
                <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-400 dark:bg-white/10 dark:text-white/40">
                  ¶{critique.paragraphIndex + 1}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-gray-600 dark:text-white/60">
                {critique.text}
              </p>
            </motion.div>
          )
        })}

        {critiques.length === 0 && !isLoading && (
          <div className="py-6 text-center text-xs text-gray-400 dark:text-white/25">
            <p>Send a research idea in chat to generate AI critiques.</p>
          </div>
        )}
      </div>
    </div>
  )
}
