"use client"

import { CopilotContext, GraphNode, GraphEdge } from "@/context/copilot-context"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { FC, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

const SNAP_DISTANCE = 80
const NODE_RADIUS = 40
const REPULSION = 2000
const DAMPING = 0.92

const NODE_STYLES: Record<GraphNode["type"], { bg: string; border: string; text: string }> = {
  literature: {
    bg: "rgba(139,92,246,0.15)",
    border: "rgba(139,92,246,0.5)",
    text: "#a78bfa"
  },
  concept: {
    bg: "rgba(6,182,212,0.15)",
    border: "rgba(6,182,212,0.5)",
    text: "#67e8f9"
  },
  method: {
    bg: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.5)",
    text: "#fbbf24"
  },
  finding: {
    bg: "rgba(16,185,129,0.15)",
    border: "rgba(16,185,129,0.5)",
    text: "#34d399"
  }
}

export const KnowledgeGraph: FC = () => {
  const { t } = useTranslation()
  const {
    graphNodes,
    setGraphNodes,
    graphEdges,
    setGraphEdges,
    currentIdea,
    graphLoading,
    graphError
  } = useContext(CopilotContext)

  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [snapTarget, setSnapTarget] = useState<string | null>(null)
  const [showSnap, setShowSnap] = useState(false)
  const [newNodeType, setNewNodeType] = useState<GraphNode["type"]>("concept")
  const [newNodeLabel, setNewNodeLabel] = useState("")
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")
  const animFrameRef = useRef<number>(0)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const graphNodesRef = useRef(graphNodes)
  graphNodesRef.current = graphNodes
  const pendingPressRef = useRef<{
    id: string
    clientX: number
    clientY: number
  } | null>(null)

  useEffect(() => {
    if (!selectedNodeId) {
      setRenameDraft("")
      return
    }
    const n = graphNodes.find(x => x.id === selectedNodeId)
    if (n) setRenameDraft(n.label)
  }, [selectedNodeId])

  useEffect(() => {
    setSelectedNodeId(null)
  }, [currentIdea])

  const runPhysics = useCallback(() => {
    setGraphNodes(prev => {
      const nodes = prev.map(n => ({ ...n }))

      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].pinned || nodes[i].id === dragging) continue

        let fx = 0
        let fy = 0

        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const force = REPULSION / (dist * dist)
          fx += (dx / dist) * force
          fy += (dy / dist) * force
        }

        nodes[i].vx = (nodes[i].vx + fx) * DAMPING
        nodes[i].vy = (nodes[i].vy + fy) * DAMPING
        nodes[i].x += nodes[i].vx
        nodes[i].y += nodes[i].vy

        nodes[i].x = Math.max(NODE_RADIUS, Math.min(760, nodes[i].x))
        nodes[i].y = Math.max(NODE_RADIUS, Math.min(460, nodes[i].y))
      }

      return nodes
    })
  }, [dragging])

  useEffect(() => {
    const tick = () => {
      runPhysics()
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [runPhysics])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const scaleX = 800 / rect.width
      const scaleY = 500 / rect.height

      let dragId = dragging
      if (pendingPressRef.current && !dragId) {
        const p = pendingPressRef.current
        if (Math.hypot(e.clientX - p.clientX, e.clientY - p.clientY) > 6) {
          dragId = p.id
          setDragging(p.id)
          pendingPressRef.current = null
        }
      }

      if (!dragId) return

      const mx = (e.clientX - rect.left) * scaleX - dragOffsetRef.current.x
      const my = (e.clientY - rect.top) * scaleY - dragOffsetRef.current.y

      const prev = graphNodesRef.current
      let closest: string | null = null
      let minDist = SNAP_DISTANCE
      for (const node of prev) {
        if (node.id === dragId) continue
        const dx = mx - node.x
        const dy = my - node.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < minDist) {
          minDist = dist
          closest = node.id
        }
      }

      setSnapTarget(closest)
      setShowSnap(!!closest)

      setGraphNodes(p =>
        p.map(n => (n.id === dragId ? { ...n, x: mx, y: my, vx: 0, vy: 0 } : n))
      )
    },
    [dragging]
  )

  const handleMouseUp = useCallback(() => {
    if (pendingPressRef.current && !dragging) {
      setSelectedNodeId(pendingPressRef.current.id)
    }
    pendingPressRef.current = null

    if (dragging && snapTarget) {
      const edgeExists = graphEdges.some(
        e =>
          (e.source === dragging && e.target === snapTarget) ||
          (e.source === snapTarget && e.target === dragging)
      )
      if (!edgeExists) {
        setGraphEdges(prev => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            source: dragging,
            target: snapTarget
          }
        ])
      }
    }
    setDragging(null)
    setSnapTarget(null)
    setShowSnap(false)
  }, [dragging, snapTarget, graphEdges])

  const addNode = () => {
    const label = newNodeLabel.trim() || t("New Node")
    const id = `n-${Date.now()}`
    setNewNodeLabel("")
    setGraphNodes(prev => [
      ...prev,
      {
        id,
        label,
        x: 300 + Math.random() * 200,
        y: 200 + Math.random() * 100,
        vx: 0,
        vy: 0,
        type: newNodeType
      }
    ])
    setSelectedNodeId(id)
  }

  const removeNode = (nodeId: string) => {
    setGraphNodes(prev => prev.filter(n => n.id !== nodeId))
    setGraphEdges(prev =>
      prev.filter(e => e.source !== nodeId && e.target !== nodeId)
    )
    setSelectedNodeId(prev => (prev === nodeId ? null : prev))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-white/10 dark:bg-white/5">
          {(["concept", "literature", "method", "finding"] as const).map(type => (
            <button
              key={type}
              className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                newNodeType === type
                  ? "bg-white text-gray-800 shadow-sm dark:bg-white/15 dark:text-white"
                  : "text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/60"
              }`}
              onClick={() => setNewNodeType(type)}
            >
              <span
                className="mr-1.5 inline-block size-2 rounded-full"
                style={{ backgroundColor: NODE_STYLES[type].border }}
              />
              {type}
            </button>
          ))}
        </div>

        <Input
          value={newNodeLabel}
          onChange={e => setNewNodeLabel(e.target.value)}
          placeholder={t("Node label")}
          className="h-8 w-36 border-gray-200 bg-white text-xs dark:border-white/10 dark:bg-white/5"
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault()
              addNode()
            }
          }}
        />

        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-500/30 dark:text-violet-300"
          onClick={addNode}
        >
          <IconPlus size={14} />
          {t("Add Node")}
        </motion.button>

        {selectedNodeId && (
          <div className="flex flex-wrap items-center gap-2 border-l border-gray-200 pl-3 dark:border-white/10">
            <Input
              value={renameDraft}
              onChange={e => setRenameDraft(e.target.value)}
              placeholder={t("Rename node")}
              className="h-8 w-40 border-gray-200 bg-white text-xs dark:border-white/10 dark:bg-white/5"
              onKeyDown={e => {
                if (e.key !== "Enter") return
                e.preventDefault()
                const next = renameDraft.trim()
                if (!next || !selectedNodeId) return
                setGraphNodes(prev =>
                  prev.map(n =>
                    n.id === selectedNodeId ? { ...n, label: next } : n
                  )
                )
              }}
            />
            <button
              type="button"
              className="rounded-md bg-gray-200 px-2.5 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-300 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15"
              onClick={() => {
                const next = renameDraft.trim()
                if (!next || !selectedNodeId) return
                setGraphNodes(prev =>
                  prev.map(n =>
                    n.id === selectedNodeId ? { ...n, label: next } : n
                  )
                )
              }}
            >
              {t("Apply")}
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-red-500 hover:bg-red-500/10"
              title={t("Remove node")}
              onClick={() => selectedNodeId && removeNode(selectedNodeId)}
            >
              <IconTrash size={16} />
            </button>
          </div>
        )}

        {graphLoading && (
          <span className="ml-auto text-[10px] text-gray-400 dark:text-white/40">
            {t("Generating graph with AI...")}
          </span>
        )}
      </div>

      {graphError && (
        <div className="mb-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          {graphError}
        </div>
      )}

      <div className="relative flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 backdrop-blur-sm dark:border-white/10 dark:bg-black/20">
        <svg
          ref={svgRef}
          className="size-full"
          viewBox="0 0 800 500"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <rect
            width={800}
            height={500}
            fill="transparent"
            onMouseDown={() => {
              setSelectedNodeId(null)
              pendingPressRef.current = null
            }}
          />
          <defs>
            <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="snap-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="15" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {graphEdges.map(edge => {
            const source = graphNodes.find(n => n.id === edge.source)
            const target = graphNodes.find(n => n.id === edge.target)
            if (!source || !target) return null
            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={2}
                strokeDasharray="6,4"
              />
            )
          })}

          <AnimatePresence>
            {showSnap && snapTarget && dragging && (() => {
              const dragNode = graphNodes.find(n => n.id === dragging)
              const targetNode = graphNodes.find(n => n.id === snapTarget)
              if (!dragNode || !targetNode) return null
              return (
                <motion.line
                  key="snap-line"
                  x1={dragNode.x}
                  y1={dragNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="rgba(168,85,247,0.6)"
                  strokeWidth={3}
                  strokeDasharray="8,4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  filter="url(#snap-glow)"
                />
              )
            })()}
          </AnimatePresence>

          <AnimatePresence>
            {showSnap && snapTarget && (() => {
              const targetNode = graphNodes.find(n => n.id === snapTarget)
              if (!targetNode) return null
              return (
                <motion.circle
                  key="snap-indicator"
                  cx={targetNode.x}
                  cy={targetNode.y}
                  r={NODE_RADIUS + 15}
                  fill="none"
                  stroke="rgba(168,85,247,0.4)"
                  strokeWidth={2}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )
            })()}
          </AnimatePresence>

          {graphNodes.map(node => {
            const style = NODE_STYLES[node.type]
            const isActive = dragging === node.id
            const isSnapTarget = snapTarget === node.id
            const isSelected = selectedNodeId === node.id

            return (
              <g
                key={node.id}
                style={{ cursor: isActive ? "grabbing" : "grab" }}
                onMouseDown={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  const rect = svgRef.current!.getBoundingClientRect()
                  const scaleX = 800 / rect.width
                  const scaleY = 500 / rect.height
                  const svgX = (e.clientX - rect.left) * scaleX
                  const svgY = (e.clientY - rect.top) * scaleY
                  dragOffsetRef.current = {
                    x: svgX - node.x,
                    y: svgY - node.y
                  }
                  pendingPressRef.current = {
                    id: node.id,
                    clientX: e.clientX,
                    clientY: e.clientY
                  }
                }}
                onDoubleClick={e => {
                  e.stopPropagation()
                  if (e.shiftKey) removeNode(node.id)
                }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS}
                  fill={style.bg}
                  stroke={
                    isSelected ? "rgba(168,85,247,0.95)" : style.border
                  }
                  strokeWidth={
                    isActive ? 3 : isSnapTarget ? 2.5 : isSelected ? 2.5 : 1.5
                  }
                  filter={isActive ? "url(#node-glow)" : undefined}
                />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="pointer-events-none select-none text-[11px] font-medium"
                  fill={style.text}
                >
                  {node.label.length > 14
                    ? node.label.substring(0, 14) + "..."
                    : node.label}
                </text>
              </g>
            )
          })}
        </svg>

        <div className="absolute bottom-3 left-3 max-w-[90%] rounded-lg border border-gray-200 bg-white/80 px-3 py-2 text-[10px] text-gray-500 backdrop-blur-sm dark:border-white/10 dark:bg-black/50 dark:text-white/40">
          {t("graph.hint")}
        </div>
      </div>
    </div>
  )
}
