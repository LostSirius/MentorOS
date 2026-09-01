"use client"

import { ChatbotUIContext } from "@/context/context"
import { CopilotContext, RadarValues } from "@/context/copilot-context"
import {
  generateEvaluator,
  resolveModelProvider
} from "@/lib/copilot-generator"
import { motion, AnimatePresence } from "framer-motion"
import { IconRefresh, IconDatabase } from "@tabler/icons-react"
import { FC, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

const DIMENSIONS: (keyof RadarValues)[] = [
  "feasibility",
  "novelty",
  "impact",
  "significance",
  "clarity"
]

const DIMENSION_LABELS: Record<keyof RadarValues, string> = {
  feasibility: "Feasibility",
  novelty: "Novelty",
  impact: "Impact",
  significance: "Significance",
  clarity: "Clarity"
}

const DIMENSION_COLORS: Record<keyof RadarValues, string> = {
  feasibility: "#06b6d4",
  novelty: "#a855f7",
  impact: "#f59e0b",
  significance: "#10b981",
  clarity: "#3b82f6"
}

const CENTER = 160
const RADIUS = 120
const MAX_VALUE = 10
const LEVELS = 5

function polarToCartesian(
  angle: number,
  value: number,
  maxVal: number = MAX_VALUE
): { x: number; y: number } {
  const r = (value / maxVal) * RADIUS
  const rad = (angle - 90) * (Math.PI / 180)
  return {
    x: CENTER + r * Math.cos(rad),
    y: CENTER + r * Math.sin(rad)
  }
}

const CACHE_KEY = "eval-cache"
const CACHE_MAX = 20

interface EvalCacheEntry {
  scores: RadarValues
  suggestions: Record<keyof RadarValues, string>
  timestamp: number
}

function hashIdea(idea: string): string {
  const trimmed = idea.trim().slice(0, 2000)
  let h = 0
  for (let i = 0; i < trimmed.length; i++) {
    h = ((h << 5) - h + trimmed.charCodeAt(i)) | 0
  }
  return "e_" + (h >>> 0).toString(36)
}

function loadCache(): Record<string, EvalCacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveToCache(key: string, entry: EvalCacheEntry) {
  try {
    const cache = loadCache()
    cache[key] = entry
    const keys = Object.keys(cache)
    if (keys.length > CACHE_MAX) {
      const oldest = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)
      for (let i = 0; i < keys.length - CACHE_MAX; i++) {
        delete cache[oldest[i]]
      }
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {}
}

function getFromCache(key: string): EvalCacheEntry | null {
  const cache = loadCache()
  return cache[key] || null
}

export const InteractiveRadarChart: FC = () => {
  const { t } = useTranslation()
  const { radarValues, setRadarValues, currentIdea, apiKey } = useContext(CopilotContext)
  const { chatSettings, models, availableHostedModels, availableLocalModels, availableOpenRouterModels } =
    useContext(ChatbotUIContext)

  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredDim, setHoveredDim] = useState<keyof RadarValues | null>(null)
  const [animatedScore, setAnimatedScore] = useState(0)
  const [suggestions, setSuggestions] = useState<Record<keyof RadarValues, string>>({
    feasibility: "",
    novelty: "",
    impact: "",
    significance: "",
    clarity: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cached, setCached] = useState(false)

  function fallbackSuggestions(idea: string): Record<keyof RadarValues, string> {
    const core = idea.trim().toLowerCase()
    const hasMethod = /method|algorithm|approach|framework|model|network|architecture/.test(core)
    const hasData = /dataset|data|benchmark|corpus/.test(core)
    const hasMetric = /accuracy|f1|bleu|rouge|map|score|metric/.test(core)
    const hasComparison = /compare|vs|baseline|existing|prior|previous/.test(core)

    return {
      feasibility: hasMethod
        ? "Define the computational budget and training time. Specify hardware requirements to make feasibility concrete."
        : "Add technical details about implementation approach. Define required resources, data, and tools.",
      novelty: hasComparison
        ? "Highlight the key differentiator from baselines. Quantify the expected improvement margin."
        : "Compare explicitly with 2-3 closest existing works. Identify what gap your idea fills.",
      impact: hasMetric
        ? "Connect the metric improvement to real-world outcomes. Explain who benefits and by how much."
        : "Define success metrics and explain downstream applications. State the problem's scope and urgency.",
      significance: hasData
        ? "Clarify why this dataset or task matters. Cite domain-specific statistics on the problem scale."
        : "Ground the problem in a specific domain or application. Reference surveys or reports on problem prevalence.",
      clarity: core.length > 100
        ? "Break the idea into objective, method, and expected outcome. Remove ambiguities in scope and assumptions."
        : "Expand with concrete details: input, process, and output. Define scope boundaries and assumptions."
    }
  }

  function fallbackScores(): RadarValues {
    return { feasibility: 6, novelty: 6, impact: 6, significance: 6, clarity: 6 }
  }

  const angleStep = 360 / DIMENSIONS.length

  const computeScore = useCallback((values: RadarValues) => {
    const weights = {
      feasibility: 0.2,
      novelty: 0.25,
      impact: 0.25,
      significance: 0.15,
      clarity: 0.15
    }
    let total = 0
    for (const dim of DIMENSIONS) {
      total += values[dim] * weights[dim]
    }
    return Math.round(total * 10) / 10
  }, [])

  useEffect(() => {
    const target = computeScore(radarValues)
    const step = (target - animatedScore) / 10
    let current = animatedScore
    const interval = setInterval(() => {
      current += step
      if (Math.abs(current - target) < 0.05) {
        current = target
        clearInterval(interval)
      }
      setAnimatedScore(Math.round(current * 10) / 10)
    }, 30)
    return () => clearInterval(interval)
  }, [radarValues])

  useEffect(() => {
    if (!currentIdea.trim() || !chatSettings) return

    const cacheKey = hashIdea(currentIdea)
    const hit = getFromCache(cacheKey)
    if (hit) {
      setRadarValues(hit.scores)
      setSuggestions(hit.suggestions)
      setCached(true)
      setIsLoading(false)
      setError(null)
      return
    }

    setCached(false)
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

    generateEvaluator(currentIdea, chatSettings, provider, customModelId, apiKey)
      .then(result => {
        if (cancelled) return
        setRadarValues(result.scores)
        setSuggestions(result.suggestions)
        saveToCache(cacheKey, {
          scores: result.scores,
          suggestions: result.suggestions,
          timestamp: Date.now()
        })
      })
      .catch((err: Error) => {
        if (cancelled) return
        setRadarValues(fallbackScores())
        setSuggestions(fallbackSuggestions(currentIdea))
        setError(err.message || "AI evaluation failed. Using rule-based fallback.")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentIdea, chatSettings])

  const gridLines = Array.from({ length: LEVELS }, (_, i) => {
    const level = ((i + 1) / LEVELS) * MAX_VALUE
    return DIMENSIONS.map((_, di) => {
      const angle = di * angleStep
      return polarToCartesian(angle, level)
    })
  })

  const dataPoints = DIMENSIONS.map((dim, i) => ({
    dim,
    angle: i * angleStep,
    ...polarToCartesian(i * angleStep, radarValues[dim])
  }))

  const areaPath =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
    " Z"

  return (
    <div className="flex flex-col items-center">
      {error && (
        <div className="mb-3 w-full max-w-sm rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {error}
        </div>
      )}
      <div className="relative">
        <svg
          ref={svgRef}
          width={320}
          height={320}
          className="select-none"
        >
          <defs>
            <radialGradient id="radar-area-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {gridLines.map((points, li) => (
            <polygon
              key={`grid-${li}`}
              points={points.map(p => `${p.x},${p.y}`).join(" ")}
              fill="none"
              className="stroke-gray-200 dark:stroke-white/[0.08]"
              strokeWidth={1}
            />
          ))}

          {DIMENSIONS.map((_, i) => {
            const end = polarToCartesian(i * angleStep, MAX_VALUE)
            return (
              <line
                key={`axis-${i}`}
                x1={CENTER}
                y1={CENTER}
                x2={end.x}
                y2={end.y}
                className="stroke-gray-200 dark:stroke-white/[0.08]"
                strokeWidth={1}
              />
            )
          })}

          <motion.path
            d={areaPath}
            fill="url(#radar-area-gradient)"
            stroke="url(#radar-area-gradient)"
            strokeWidth={2}
            filter="url(#glow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          <polygon
            points={dataPoints.map(p => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="rgba(168, 85, 247, 0.6)"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {dataPoints.map(({ dim, x, y }, i) => (
            <g key={dim}>
              <motion.circle
                cx={x}
                cy={y}
                r={hoveredDim === dim ? 8 : 6}
                fill={DIMENSION_COLORS[dim]}
                stroke="white"
                strokeWidth={2}
                style={{ cursor: "pointer", filter: "url(#glow)" }}
                whileHover={{ scale: 1.3 }}
                onMouseEnter={() => setHoveredDim(dim)}
                onMouseLeave={() => setHoveredDim(null)}
              />

              {(() => {
                const labelPos = polarToCartesian(
                  i * angleStep,
                  MAX_VALUE + 1.8
                )
                return (
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`select-none text-[11px] font-medium ${
                      hoveredDim === dim
                        ? ""
                        : "text-gray-500 dark:text-white/60"
                    }`}
                    fill={
                      hoveredDim === dim
                        ? DIMENSION_COLORS[dim]
                        : "currentColor"
                    }
                  >
                    {DIMENSION_LABELS[dim]}
                  </text>
                )
              })()}

              {hoveredDim === dim && (
                <motion.text
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  x={x}
                  y={y - 16}
                  textAnchor="middle"
                  className="text-xs font-bold text-gray-800 dark:text-white"
                  fill="currentColor"
                >
                  {radarValues[dim]}
                </motion.text>
              )}
            </g>
          ))}

          <text
            x={CENTER}
            y={CENTER - 8}
            textAnchor="middle"
            className="text-2xl font-bold text-gray-800 dark:text-white"
            fill="currentColor"
          >
            {animatedScore}
          </text>
          <text
            x={CENTER}
            y={CENTER + 12}
            textAnchor="middle"
            className="text-[10px] text-gray-500 dark:text-white/50"
            fill="currentColor"
          >
            Overall Score
          </text>
        </svg>
      </div>

      <div className="mt-4 grid w-full grid-cols-5 gap-2">
        {DIMENSIONS.map(dim => (
          <button
            key={dim}
            className="flex flex-col items-center gap-1 rounded-lg border border-transparent p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.03]"
            onMouseEnter={() => setHoveredDim(dim)}
            onMouseLeave={() => setHoveredDim(null)}
          >
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: DIMENSION_COLORS[dim] }}
            />
            <span className="text-[10px] text-gray-500 dark:text-white/50">
              {DIMENSION_LABELS[dim]}
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: DIMENSION_COLORS[dim] }}
            >
              {isLoading ? "..." : radarValues[dim]}
            </span>
          </button>
        ))}
      </div>

      {(cached || !isLoading) && currentIdea.trim() && (
        <div className="mt-3 flex items-center gap-3">
          {cached && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 dark:text-emerald-400">
              <IconDatabase size={12} />
              {t("Cached result")}
            </span>
          )}
          <button
            onClick={() => {
              const key = hashIdea(currentIdea)
              try {
                const cache = loadCache()
                delete cache[key]
                localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
              } catch {}
              setCached(false)
              setIsLoading(true)
              setError(null)
              const { provider, customModelId } = resolveModelProvider(
                chatSettings!.model,
                models,
                availableHostedModels,
                availableLocalModels,
                availableOpenRouterModels
              )
              generateEvaluator(currentIdea, chatSettings!, provider, customModelId, apiKey)
                .then(result => {
                  setRadarValues(result.scores)
                  setSuggestions(result.suggestions)
                  saveToCache(hashIdea(currentIdea), {
                    scores: result.scores,
                    suggestions: result.suggestions,
                    timestamp: Date.now()
                  })
                })
                .catch((err: Error) => {
                  setRadarValues(fallbackScores())
                  setSuggestions(fallbackSuggestions(currentIdea))
                  setError(err.message || "AI evaluation failed.")
                })
                .finally(() => setIsLoading(false))
            }}
            disabled={isLoading}
            className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-500 transition-colors hover:bg-violet-500/10 hover:text-violet-500 disabled:opacity-50 dark:bg-white/5 dark:text-white/40 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
          >
            <IconRefresh size={12} />
            {t("Re-evaluate")}
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {hoveredDim && (
          <motion.div
            key={hoveredDim}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="mt-4 w-full max-w-sm rounded-xl border p-4 text-left"
            style={{
              borderColor: `${DIMENSION_COLORS[hoveredDim]}40`,
              backgroundColor: `${DIMENSION_COLORS[hoveredDim]}10`
            }}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <div
                className="size-2 rounded-full"
                style={{ backgroundColor: DIMENSION_COLORS[hoveredDim] }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: DIMENSION_COLORS[hoveredDim] }}
              >
                How to improve {DIMENSION_LABELS[hoveredDim]}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-gray-600 dark:text-white/70">
              {isLoading
                ? "Generating AI-powered suggestions..."
                : suggestions[hoveredDim] || "Hover to see AI-generated advice for this dimension."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
