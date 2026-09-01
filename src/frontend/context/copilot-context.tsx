"use client"

import type { IdeaCandidate, IdeaCard } from "@/lib/idea-types"
import type { ExperimentRecord } from "@/lib/experiment-types"
import type { FigureSession } from "@/lib/figure-types"
import type { ReviewSession } from "@/lib/review-types"
import type { WritingSession } from "@/lib/writing-types"
import { Dispatch, SetStateAction, createContext } from "react"

export type CanvasMode =
  | "idle"
  | "evaluator"
  | "drafting"
  | "knowledge-graph"
  | "brainstorm"
  | "literature-review"

export interface ReasoningStep {
  id: string
  label: string
  detail?: string
  status: "pending" | "active" | "complete" | "error"
  duration?: number
}

export interface RadarValues {
  feasibility: number
  novelty: number
  impact: number
  significance: number
  clarity: number
}

export interface EvaluationResult {
  score: number
  summary: string
  strengths: string[]
  weaknesses: string[]
}

export interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  vx: number
  vy: number
  type: "literature" | "concept" | "method" | "finding"
  pinned?: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface Critique {
  id: string
  paragraphIndex: number
  text: string
  type: "suggestion" | "issue" | "praise"
}

export interface LiteratureCodeRepository {
  name: string
  url: string
  stars: number
  language: string
  description?: string
}

export interface LiteraturePaper {
  id: string
  title: string
  authors: string[]
  year: number
  summary: string
  /** Short card blurb for the paper list */
  brief?: string
  method?: string
  datasets?: string[]
  results?: string[]
  url: string
  relevance?: number
  code: LiteratureCodeRepository | null
  venue?: string
  citationCount?: number
  sources?: string[]
}

export interface LiteratureLineage {
  narrative: string
  threads: {
    name: string
    description: string
    paperIds: string[]
  }[]
}

export interface LiteratureReviewResult {
  topic: string
  papers: LiteraturePaper[]
  review: {
    abstract: string
    sections: {
      heading: string
      content: string
    }[]
    gaps: string[]
    futureDirections: string[]
  }
  lineage?: LiteratureLineage
  timeline: {
    year: number
    method: string
    paperId: string
    contribution: string
  }[]
  references: string[]
  poster: {
    title: string
    subtitle: string
    problem: string
    methodEvolution: string[]
    keyFindings: string[]
    takeaway: string
  }
  quality: {
    topicRelevanceEstimate: number
    codeCoverage: number
    limitations: string[]
  }
  evidence?: {
    retrievedAt: string
    source: string
    papers: unknown[]
    stats?: {
      selected: number
      poolSize: number
      requested: number
    }
  }
  domains?: { id: string; labelZh: string; labelEn: string }[]
  queryPlan?: {
    phrases: string[]
    primaryEn: string
    backgroundZh?: string
    backgroundEn?: string
  }
}

export interface SkillInfo {
  id: string
  name: string
  description: string
  icon: string
  canvas_mode: CanvasMode | string
  available: boolean
}

export interface DetectedSkill {
  id: string
  name: string
  description: string
  icon: string
  canvas_mode: string
}

export interface AgentDetectResult {
  detected: boolean
  skill: DetectedSkill | null
  system_prompt: string
}

interface CopilotContextType {
  canvasMode: CanvasMode
  setCanvasMode: Dispatch<SetStateAction<CanvasMode>>

  reasoningSteps: ReasoningStep[]
  setReasoningSteps: Dispatch<SetStateAction<ReasoningStep[]>>
  isReasoning: boolean
  setIsReasoning: Dispatch<SetStateAction<boolean>>

  radarValues: RadarValues
  setRadarValues: Dispatch<SetStateAction<RadarValues>>
  evaluationResult: EvaluationResult | null
  setEvaluationResult: Dispatch<SetStateAction<EvaluationResult | null>>

  activeHighlight: string | null
  setActiveHighlight: Dispatch<SetStateAction<string | null>>

  selectedText: string
  setSelectedText: Dispatch<SetStateAction<string>>
  selectionPosition: { x: number; y: number } | null
  setSelectionPosition: Dispatch<
    SetStateAction<{ x: number; y: number } | null>
  >

  graphNodes: GraphNode[]
  setGraphNodes: Dispatch<SetStateAction<GraphNode[]>>
  graphEdges: GraphEdge[]
  setGraphEdges: Dispatch<SetStateAction<GraphEdge[]>>

  graphLoading: boolean
  setGraphLoading: Dispatch<SetStateAction<boolean>>
  graphError: string | null
  setGraphError: Dispatch<SetStateAction<string | null>>

  isVoiceActive: boolean
  setIsVoiceActive: Dispatch<SetStateAction<boolean>>
  voiceBullets: string[]
  setVoiceBullets: Dispatch<SetStateAction<string[]>>

  draftContent: string
  setDraftContent: Dispatch<SetStateAction<string>>
  critiques: Critique[]
  setCritiques: Dispatch<SetStateAction<Critique[]>>

  currentIdea: string
  setCurrentIdea: Dispatch<SetStateAction<string>>

  brainstormAnalysis: string | null
  setBrainstormAnalysis: Dispatch<SetStateAction<string | null>>

  literatureReview: LiteratureReviewResult | null
  setLiteratureReview: Dispatch<SetStateAction<LiteratureReviewResult | null>>
  literatureReviewLoading: boolean
  setLiteratureReviewLoading: Dispatch<SetStateAction<boolean>>
  literatureReviewError: string | null
  setLiteratureReviewError: Dispatch<SetStateAction<string | null>>

  ideaCandidates: IdeaCandidate[]
  setIdeaCandidates: Dispatch<SetStateAction<IdeaCandidate[]>>
  ideaCard: IdeaCard | null
  setIdeaCard: Dispatch<SetStateAction<IdeaCard | null>>
  ideaLoading: boolean
  setIdeaLoading: Dispatch<SetStateAction<boolean>>
  ideaError: string | null
  setIdeaError: Dispatch<SetStateAction<string | null>>

  experimentRecord: ExperimentRecord | null
  setExperimentRecord: Dispatch<SetStateAction<ExperimentRecord | null>>
  experimentLoading: boolean
  setExperimentLoading: Dispatch<SetStateAction<boolean>>
  experimentError: string | null
  setExperimentError: Dispatch<SetStateAction<string | null>>

  writingSession: WritingSession | null
  setWritingSession: Dispatch<SetStateAction<WritingSession | null>>
  writingLoading: boolean
  setWritingLoading: Dispatch<SetStateAction<boolean>>
  writingError: string | null
  setWritingError: Dispatch<SetStateAction<string | null>>

  figureSession: FigureSession | null
  setFigureSession: Dispatch<SetStateAction<FigureSession | null>>
  figuresLoading: boolean
  setFiguresLoading: Dispatch<SetStateAction<boolean>>
  figuresError: string | null
  setFiguresError: Dispatch<SetStateAction<string | null>>

  reviewSession: ReviewSession | null
  setReviewSession: Dispatch<SetStateAction<ReviewSession | null>>
  reviewLoading: boolean
  setReviewLoading: Dispatch<SetStateAction<boolean>>
  reviewError: string | null
  setReviewError: Dispatch<SetStateAction<string | null>>

  showCanvas: boolean
  setShowCanvas: Dispatch<SetStateAction<boolean>>

  availableSkills: SkillInfo[]
  setAvailableSkills: Dispatch<SetStateAction<SkillInfo[]>>

  detectedSkill: DetectedSkill | null
  setDetectedSkill: Dispatch<SetStateAction<DetectedSkill | null>>
  agentSystemPrompt: string
  setAgentSystemPrompt: Dispatch<SetStateAction<string>>
  agentReady: boolean
  setAgentReady: Dispatch<SetStateAction<boolean>>

  apiKey: string
  setApiKey: Dispatch<SetStateAction<string>>

  uploadedFileContent: string
  setUploadedFileContent: Dispatch<SetStateAction<string>>
  uploadedFileName: string
  setUploadedFileName: Dispatch<SetStateAction<string>>
}

export const CopilotContext = createContext<CopilotContextType>({
  canvasMode: "idle",
  setCanvasMode: () => {},
  reasoningSteps: [],
  setReasoningSteps: () => {},
  isReasoning: false,
  setIsReasoning: () => {},
  radarValues: {
    feasibility: 7,
    novelty: 6,
    impact: 5,
    significance: 6,
    clarity: 7
  },
  setRadarValues: () => {},
  evaluationResult: null,
  setEvaluationResult: () => {},
  activeHighlight: null,
  setActiveHighlight: () => {},
  selectedText: "",
  setSelectedText: () => {},
  selectionPosition: null,
  setSelectionPosition: () => {},
  graphNodes: [],
  setGraphNodes: () => {},
  graphEdges: [],
  setGraphEdges: () => {},
  graphLoading: false,
  setGraphLoading: () => {},
  graphError: null,
  setGraphError: () => {},
  isVoiceActive: false,
  setIsVoiceActive: () => {},
  voiceBullets: [],
  setVoiceBullets: () => {},
  draftContent: "",
  setDraftContent: () => {},
  critiques: [],
  setCritiques: () => {},
  currentIdea: "",
  setCurrentIdea: () => {},
  brainstormAnalysis: null,
  setBrainstormAnalysis: () => {},
  literatureReview: null,
  setLiteratureReview: () => {},
  literatureReviewLoading: false,
  setLiteratureReviewLoading: () => {},
  literatureReviewError: null,
  setLiteratureReviewError: () => {},
  ideaCandidates: [],
  setIdeaCandidates: () => {},
  ideaCard: null,
  setIdeaCard: () => {},
  ideaLoading: false,
  setIdeaLoading: () => {},
  ideaError: null,
  setIdeaError: () => {},
  experimentRecord: null,
  setExperimentRecord: () => {},
  experimentLoading: false,
  setExperimentLoading: () => {},
  experimentError: null,
  setExperimentError: () => {},
  writingSession: null,
  setWritingSession: () => {},
  writingLoading: false,
  setWritingLoading: () => {},
  writingError: null,
  setWritingError: () => {},
  figureSession: null,
  setFigureSession: () => {},
  figuresLoading: false,
  setFiguresLoading: () => {},
  figuresError: null,
  setFiguresError: () => {},
  reviewSession: null,
  setReviewSession: () => {},
  reviewLoading: false,
  setReviewLoading: () => {},
  reviewError: null,
  setReviewError: () => {},
  showCanvas: true,
  setShowCanvas: () => {},
  availableSkills: [],
  setAvailableSkills: () => {},
  detectedSkill: null,
  setDetectedSkill: () => {},
  agentSystemPrompt: "",
  setAgentSystemPrompt: () => {},
  agentReady: false,
  setAgentReady: () => {},
  apiKey: "",
  setApiKey: () => {},
  uploadedFileContent: "",
  setUploadedFileContent: () => {},
  uploadedFileName: "",
  setUploadedFileName: () => {}
})
