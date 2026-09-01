"use client"

import { CopilotContext, ReasoningStep } from "@/context/copilot-context"
import { ChatbotUIContext } from "@/context/context"
import { motion, AnimatePresence } from "framer-motion"
import {
  IconBrain,
  IconSearch,
  IconSparkles,
  IconChecklist,
  IconWriting,
  IconCircleCheck,
  IconLoader2
} from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef } from "react"

const STEP_ICONS: Record<string, any> = {
  extracting: IconSearch,
  analyzing: IconBrain,
  evaluating: IconChecklist,
  generating: IconSparkles,
  writing: IconWriting
}

function getStepIcon(label: string) {
  const key = Object.keys(STEP_ICONS).find(k =>
    label.toLowerCase().includes(k)
  )
  return key ? STEP_ICONS[key] : IconBrain
}

const DEMO_PIPELINES: Record<string, ReasoningStep[]> = {
  "idea-evaluator": [
    {
      id: "s1",
      label: "Extracting core claims",
      detail: "Parsing research hypothesis and key variables",
      status: "pending"
    },
    {
      id: "s2",
      label: "Analyzing feasibility",
      detail: "Checking methodology viability and resource requirements",
      status: "pending"
    },
    {
      id: "s3",
      label: "Evaluating novelty",
      detail: "Comparing against existing literature landscape",
      status: "pending"
    },
    {
      id: "s4",
      label: "Generating critique",
      detail: "Synthesizing structured evaluation report",
      status: "pending"
    }
  ],
  default: [
    {
      id: "s1",
      label: "Extracting key information",
      detail: "Understanding context and intent",
      status: "pending"
    },
    {
      id: "s2",
      label: "Analyzing request",
      detail: "Building reasoning chain",
      status: "pending"
    },
    {
      id: "s3",
      label: "Generating response",
      detail: "Composing structured output",
      status: "pending"
    }
  ]
}

export const ReasoningVisualizer: FC = () => {
  const { isGenerating, firstTokenReceived, toolInUse } =
    useContext(ChatbotUIContext)
  const { reasoningSteps, setReasoningSteps, isReasoning, setIsReasoning } =
    useContext(CopilotContext)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isGenerating && !firstTokenReceived) {
      const pipeline =
        toolInUse && toolInUse !== "none"
          ? DEMO_PIPELINES[toolInUse] || DEMO_PIPELINES.default
          : DEMO_PIPELINES.default

      setReasoningSteps(pipeline.map(s => ({ ...s, status: "pending" })))
      setIsReasoning(true)

      let currentStep = 0
      intervalRef.current = setInterval(() => {
        setReasoningSteps(prev => {
          const updated = [...prev]
          if (currentStep > 0 && currentStep <= updated.length) {
            updated[currentStep - 1] = {
              ...updated[currentStep - 1],
              status: "complete"
            }
          }
          if (currentStep < updated.length) {
            updated[currentStep] = {
              ...updated[currentStep],
              status: "active"
            }
          }
          return updated
        })
        currentStep++
        if (currentStep > pipeline.length) {
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      }, 1200)
    }

    if (firstTokenReceived) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setReasoningSteps(prev => prev.map(s => ({ ...s, status: "complete" })))
      setTimeout(() => setIsReasoning(false), 800)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isGenerating, firstTokenReceived])

  if (!isReasoning && reasoningSteps.length === 0) return null

  return (
    <AnimatePresence>
      {isReasoning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="my-3 overflow-hidden"
        >
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <IconBrain size={18} className="text-violet-400" />
              </motion.div>
              <span className="text-sm font-medium text-violet-300">
                Agent Reasoning Pipeline
              </span>
            </div>

            <div className="relative ml-2">
              <div className="absolute inset-y-0 left-[9px] w-px bg-gradient-to-b from-violet-500/40 via-cyan-500/40 to-transparent" />

              {reasoningSteps.map((step, index) => {
                const StepIcon = getStepIcon(step.label)
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative mb-3 flex items-start gap-3 last:mb-0"
                  >
                    <div className="relative z-10 mt-0.5">
                      {step.status === "complete" ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 20
                          }}
                        >
                          <IconCircleCheck
                            size={20}
                            className="text-emerald-400"
                          />
                        </motion.div>
                      ) : step.status === "active" ? (
                        <motion.div
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.7, 1]
                          }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <IconLoader2
                            size={20}
                            className="animate-spin text-violet-400"
                          />
                        </motion.div>
                      ) : (
                        <div className="flex size-5 items-center justify-center rounded-full border border-white/20 bg-white/5">
                          <div className="size-1.5 rounded-full bg-white/30" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 pb-1">
                      <div
                        className={`text-sm font-medium transition-colors duration-300 ${
                          step.status === "complete"
                            ? "text-emerald-300/80"
                            : step.status === "active"
                              ? "text-white"
                              : "text-white/40"
                        }`}
                      >
                        {step.label}
                      </div>
                      {step.detail && step.status === "active" && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-0.5 text-xs text-white/40"
                        >
                          {step.detail}
                        </motion.div>
                      )}
                      {step.status === "active" && (
                        <motion.div
                          className="mt-2 h-1 overflow-hidden rounded-full bg-white/5"
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                        >
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.2, ease: "easeInOut" }}
                          />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
