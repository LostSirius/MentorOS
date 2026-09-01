"use client"

import { ChatDraftContext } from "@/context/chat-draft-context"
import { CopilotContext, CanvasMode } from "@/context/copilot-context"
import { motion, AnimatePresence } from "framer-motion"
import {
  IconBulb,
  IconWriting,
  IconNetwork,
  IconBrain,
  IconBook,
  IconSparkles,
  IconArrowRight,
  IconDownload,
  IconTrash
} from "@tabler/icons-react"
import { FC, useContext } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { InteractiveRadarChart } from "./radar-chart"
import { DraftingCanvas } from "./drafting-canvas"
import { KnowledgeGraph } from "./knowledge-graph"
import { GraphDataSync } from "./graph-data-sync"
import { FileUploadZone } from "./file-upload-zone"
import { LiteratureReviewCanvas } from "./literature-review-canvas"
import { VoiceInputButton } from "./voice-input"

const MODES: {
  id: CanvasMode
  label: string
  icon: any
  description: string
  gradient: string
  border: string
}[] = [
  {
    id: "evaluator",
    label: "Evaluate",
    icon: IconBulb,
    description: "Interactive radar chart for scoring research ideas across feasibility, novelty, and impact",
    gradient: "from-amber-500/10 to-orange-500/5",
    border: "hover:border-amber-500/30"
  },
  {
    id: "drafting",
    label: "Draft",
    icon: IconWriting,
    description: "AI-critiqued introduction drafting with split-screen anchored highlights",
    gradient: "from-violet-500/10 to-purple-500/5",
    border: "hover:border-violet-500/30"
  },
  {
    id: "knowledge-graph",
    label: "Graph",
    icon: IconNetwork,
    description: "Gravity-field knowledge graph for exploring literature connections visually",
    gradient: "from-cyan-500/10 to-blue-500/5",
    border: "hover:border-cyan-500/30"
  },
  {
    id: "literature-review",
    label: "Review",
    icon: IconBook,
    description: "Retrieve recent papers, link GitHub code, and generate cited survey posters",
    gradient: "from-fuchsia-500/10 to-violet-500/5",
    border: "hover:border-fuchsia-500/30"
  },
  {
    id: "brainstorm",
    label: "Brainstorm",
    icon: IconBrain,
    description: "Voice-to-text ideation board with real-time waveform transcription",
    gradient: "from-emerald-500/10 to-teal-500/5",
    border: "hover:border-emerald-500/30"
  }
]

const IdleCanvas: FC = () => {
  const { t } = useTranslation()
  const { setCanvasMode, uploadedFileName } = useContext(CopilotContext)

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mb-6 flex items-center gap-4">
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20 blur-2xl"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="relative flex size-12 items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-white/5">
            <IconSparkles size={22} className="text-violet-500 dark:text-violet-400" />
          </div>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {t("Research Workspace")}
          </h2>
          <div className="text-xs text-gray-500 dark:text-white/40">
            {t("Choose a tool or start chatting — guidance runs in the background.")}
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-white/30">
          {t("Upload & Analyze")}
        </div>
        <FileUploadZone onFileLoaded={() => setCanvasMode("evaluator")} />
        {uploadedFileName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-center text-xs text-emerald-500 dark:text-emerald-400"
          >
            ✓ {uploadedFileName} — {t("ready for evaluation")}
          </motion.p>
        )}
      </div>

      <div className="mb-5">
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-white/30">
          {t("Canvas Workspace")}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {MODES.map((mode, i) => {
            const Icon = mode.icon
            return (
              <motion.button
                key={mode.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`group flex flex-col rounded-xl border border-gray-200 bg-gradient-to-br dark:border-white/[0.06] ${mode.gradient} p-3.5 text-left transition-all ${mode.border}`}
                onClick={() => setCanvasMode(mode.id)}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.06]">
                    <Icon size={16} className="text-gray-500 dark:text-white/60" />
                  </div>
                  <IconArrowRight
                    size={14}
                    className="text-transparent transition-all group-hover:text-gray-400 dark:group-hover:text-white/40"
                  />
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-white/75">
                  {t(mode.label)}
                </div>
                <div className="mt-0.5 text-[10px] leading-snug text-gray-400 dark:text-white/30">
                  {t(mode.description)}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const BrainstormCanvas: FC = () => {
  const { t } = useTranslation()
  const { voiceBullets, setVoiceBullets } = useContext(CopilotContext)
  const { setUserInput } = useContext(ChatDraftContext)

  const analyzeIdeas = () => {
    if (voiceBullets.length === 0) return
    // Prefix triggers silent brainstorm procedure on send (no skill UI)
    const prompt = `brainstorm: Organize these notes into themes, score viability, and propose concrete research questions:\n\n${voiceBullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}`
    setUserInput(prompt)
    toast.success("Ideas loaded into chat. Press Enter to analyze.")
  }

  const exportIdeas = async () => {
    if (voiceBullets.length === 0) return
    const markdown = `# Brainstorm Ideas\n\n${voiceBullets.map((b, i) => `- ${b}`).join("\n")}`
    try {
      await navigator.clipboard.writeText(markdown)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Copy failed")
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-white/80">
          {t("Brainstorm Board")}
        </h3>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs dark:border-white/10"
            onClick={exportIdeas}
          >
            <IconDownload size={12} />
            Export
          </button>
          <button
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs dark:border-white/10"
            onClick={() => setVoiceBullets([])}
          >
            <IconTrash size={12} />
            Clear
          </button>
        </div>
      </div>
      <VoiceInputButton />
      <div className="flex flex-1 flex-col gap-2">
        {voiceBullets.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-white/30">
            {t("Use voice input or add ideas, then analyze in chat.")}
          </p>
        ) : (
          voiceBullets.map((b, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
            >
              {b}
            </div>
          ))
        )}
      </div>
      <button
        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        disabled={voiceBullets.length === 0}
        onClick={analyzeIdeas}
      >
        {t("Send to chat for analysis")}
      </button>
    </div>
  )
}

const EvaluatorPanel: FC = () => {
  return (
    <div className="h-full overflow-y-auto">
      <InteractiveRadarChart />
    </div>
  )
}

export const CanvasWorkspace: FC = () => {
  const { t } = useTranslation()
  const { canvasMode, setCanvasMode } = useContext(CopilotContext)

  return (
    <div className="flex h-full flex-col">
      <GraphDataSync />
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex items-center rounded-xl border border-gray-200 bg-gray-100 p-1 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
          {MODES.map(mode => {
            const Icon = mode.icon
            const isActive = canvasMode === mode.id
            return (
              <motion.button
                key={mode.id}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/60"
                }`}
                onClick={() => setCanvasMode(isActive ? "idle" : mode.id)}
                whileTap={{ scale: 0.97 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="canvas-tab"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-white/10"
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 30
                    }}
                  />
                )}
                <Icon size={16} className="relative z-10" />
                <span className="relative z-10">{t(mode.label)}</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={canvasMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {canvasMode === "idle" && <IdleCanvas />}
            {canvasMode === "evaluator" && <EvaluatorPanel />}
            {canvasMode === "drafting" && <DraftingCanvas />}
            {canvasMode === "knowledge-graph" && <KnowledgeGraph />}
            {canvasMode === "literature-review" && <LiteratureReviewCanvas />}
            {canvasMode === "brainstorm" && <BrainstormCanvas />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
