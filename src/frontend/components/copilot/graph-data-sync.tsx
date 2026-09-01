"use client"

import { ChatbotUIContext } from "@/context/context"
import { CopilotContext } from "@/context/copilot-context"
import {
  generateGraph,
  resolveModelProvider
} from "@/lib/copilot-generator"
import {
  fallbackGraphFromIdea,
  layoutNodesForGraph
} from "@/lib/knowledge-graph-helpers"
import { FC, useContext, useEffect } from "react"

/**
 * Keeps knowledge graph in sync with currentIdea whenever the canvas is open.
 * Mount this once (e.g. in CanvasWorkspace) so graphs generate even when the
 * user has not switched to the Graph tab yet.
 */
export const GraphDataSync: FC = () => {
  const {
    currentIdea,
    setGraphNodes,
    setGraphEdges,
    setGraphLoading,
    setGraphError,
    apiKey
  } = useContext(CopilotContext)

  const {
    chatSettings,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext)

  useEffect(() => {
    if (!currentIdea.trim() || !chatSettings) {
      setGraphLoading(false)
      setGraphError(null)
      setGraphNodes([
        {
          id: "n1",
          label: "Research Idea",
          x: 400,
          y: 250,
          vx: 0,
          vy: 0,
          type: "concept"
        }
      ])
      setGraphEdges([])
      return
    }

    let cancelled = false
    setGraphLoading(true)
    setGraphError(null)

    const { provider, customModelId } = resolveModelProvider(
      chatSettings.model,
      models,
      availableHostedModels,
      availableLocalModels,
      availableOpenRouterModels
    )

    generateGraph(currentIdea, chatSettings, provider, customModelId, apiKey)
      .then(result => {
        if (cancelled) return
        const laidOut = layoutNodesForGraph(result.nodes)
        setGraphNodes(laidOut)
        setGraphEdges(
          result.edges.map((e, i) => ({
            id: `e${i}`,
            source: e.source,
            target: e.target
          }))
        )
        setGraphError(null)
      })
      .catch((err: Error) => {
        if (cancelled) return
        const fallback = fallbackGraphFromIdea(currentIdea)
        const laidOut = layoutNodesForGraph(fallback.nodes)
        setGraphNodes(laidOut)
        setGraphEdges(
          fallback.edges.map((e, i) => ({
            id: `e${i}`,
            source: e.source,
            target: e.target
          }))
        )
        setGraphError(
          err.message || "AI graph generation failed. Using keyword-based fallback."
        )
      })
      .finally(() => {
        if (!cancelled) setGraphLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    currentIdea,
    chatSettings,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels,
    setGraphNodes,
    setGraphEdges,
    setGraphLoading,
    setGraphError
  ])

  return null
}
