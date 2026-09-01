"use client"

import {
  CopilotContext,
  CanvasMode,
  ReasoningStep,
  RadarValues,
  EvaluationResult,
  GraphNode,
  GraphEdge,
  Critique,
  SkillInfo,
  DetectedSkill,
  LiteratureReviewResult
} from "@/context/copilot-context"
import type { IdeaCandidate, IdeaCard } from "@/lib/idea-types"
import type { ExperimentRecord } from "@/lib/experiment-types"
import type { FigureSession } from "@/lib/figure-types"
import type { ReviewSession } from "@/lib/review-types"
import type { WritingSession } from "@/lib/writing-types"
import { FC, ReactNode, useEffect, useState } from "react"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_SUPERVISOR_SKILLS_BACKEND_URL ||
  "http://localhost:6000"

interface CopilotProviderProps {
  children: ReactNode
}

export const CopilotProvider: FC<CopilotProviderProps> = ({ children }) => {
  const [canvasMode, setCanvasMode] = useState<CanvasMode>("idle")
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([])
  const [isReasoning, setIsReasoning] = useState(false)
  const [radarValues, setRadarValues] = useState<RadarValues>({
    feasibility: 7,
    novelty: 6,
    impact: 5,
    significance: 6,
    clarity: 7
  })
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null)
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null)
  const [selectedText, setSelectedText] = useState("")
  const [selectionPosition, setSelectionPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([])
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([])
  const [graphLoading, setGraphLoading] = useState(false)
  const [graphError, setGraphError] = useState<string | null>(null)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [voiceBullets, setVoiceBullets] = useState<string[]>([])
  const [draftContent, setDraftContent] = useState("")
  const [critiques, setCritiques] = useState<Critique[]>([])
  const [currentIdea, setCurrentIdea] = useState("")
  const [brainstormAnalysis, setBrainstormAnalysis] = useState<string | null>(null)
  const [literatureReview, setLiteratureReview] =
    useState<LiteratureReviewResult | null>(null)
  const [literatureReviewLoading, setLiteratureReviewLoading] = useState(false)
  const [literatureReviewError, setLiteratureReviewError] = useState<string | null>(null)
  const [ideaCandidates, setIdeaCandidates] = useState<IdeaCandidate[]>([])
  const [ideaCard, setIdeaCard] = useState<IdeaCard | null>(null)
  const [ideaLoading, setIdeaLoading] = useState(false)
  const [ideaError, setIdeaError] = useState<string | null>(null)
  const [experimentRecord, setExperimentRecord] =
    useState<ExperimentRecord | null>(null)
  const [experimentLoading, setExperimentLoading] = useState(false)
  const [experimentError, setExperimentError] = useState<string | null>(null)
  const [writingSession, setWritingSession] = useState<WritingSession | null>(
    null
  )
  const [writingLoading, setWritingLoading] = useState(false)
  const [writingError, setWritingError] = useState<string | null>(null)
  const [figureSession, setFigureSession] = useState<FigureSession | null>(null)
  const [figuresLoading, setFiguresLoading] = useState(false)
  const [figuresError, setFiguresError] = useState<string | null>(null)
  const [reviewSession, setReviewSession] = useState<ReviewSession | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [showCanvas, setShowCanvas] = useState(true)

  const [availableSkills, setAvailableSkills] = useState<SkillInfo[]>([])
  const [detectedSkill, setDetectedSkill] = useState<DetectedSkill | null>(
    null
  )
  const [agentSystemPrompt, setAgentSystemPrompt] = useState("")
  const [agentReady, setAgentReady] = useState(false)

  const [uploadedFileContent, setUploadedFileContent] = useState("")
  const [uploadedFileName, setUploadedFileName] = useState("")

  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("supervisor-skills-api-key") || ""
    }
    return ""
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("supervisor-skills-api-key", apiKey)
    }
  }, [apiKey])

  useEffect(() => {
    fetch(`${BACKEND_URL}/v1/skills`)
      .then(res => res.json())
      .then(data => {
        if (data.skills) setAvailableSkills(data.skills)
        setAgentReady(true)
      })
      .catch(() => {
        setAgentReady(false)
      })

    // Skills inject silently via skill-resolver — do not seed visible assistants
  }, [])

  return (
    <CopilotContext.Provider
      value={{
        canvasMode,
        setCanvasMode,
        reasoningSteps,
        setReasoningSteps,
        isReasoning,
        setIsReasoning,
        radarValues,
        setRadarValues,
        evaluationResult,
        setEvaluationResult,
        activeHighlight,
        setActiveHighlight,
        selectedText,
        setSelectedText,
        selectionPosition,
        setSelectionPosition,
        graphNodes,
        setGraphNodes,
        graphEdges,
        setGraphEdges,
        graphLoading,
        setGraphLoading,
        graphError,
        setGraphError,
        isVoiceActive,
        setIsVoiceActive,
        voiceBullets,
        setVoiceBullets,
        draftContent,
        setDraftContent,
        critiques,
        setCritiques,
        currentIdea,
        setCurrentIdea,
        brainstormAnalysis,
        setBrainstormAnalysis,
        literatureReview,
        setLiteratureReview,
        literatureReviewLoading,
        setLiteratureReviewLoading,
        literatureReviewError,
        setLiteratureReviewError,
        ideaCandidates,
        setIdeaCandidates,
        ideaCard,
        setIdeaCard,
        ideaLoading,
        setIdeaLoading,
        ideaError,
        setIdeaError,
        experimentRecord,
        setExperimentRecord,
        experimentLoading,
        setExperimentLoading,
        experimentError,
        setExperimentError,
        writingSession,
        setWritingSession,
        writingLoading,
        setWritingLoading,
        writingError,
        setWritingError,
        figureSession,
        setFigureSession,
        figuresLoading,
        setFiguresLoading,
        figuresError,
        setFiguresError,
        reviewSession,
        setReviewSession,
        reviewLoading,
        setReviewLoading,
        reviewError,
        setReviewError,
        showCanvas,
        setShowCanvas,
        availableSkills,
        setAvailableSkills,
        detectedSkill,
        setDetectedSkill,
        agentSystemPrompt,
        setAgentSystemPrompt,
        agentReady,
        setAgentReady,
        apiKey,
        setApiKey,
        uploadedFileContent,
        setUploadedFileContent,
        uploadedFileName,
        setUploadedFileName
      }}
    >
      {children}
    </CopilotContext.Provider>
  )
}
