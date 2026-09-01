import { GraphNode } from "@/context/copilot-context"

export function layoutNodesForGraph(
  nodes: { id: string; label: string; type: GraphNode["type"] }[]
): GraphNode[] {
  if (nodes.length === 0) return []

  const centerX = 400
  const centerY = 250

  return nodes.map((n, i) => {
    if (i === 0) {
      return {
        id: n.id,
        label: n.label,
        x: centerX,
        y: centerY,
        vx: 0,
        vy: 0,
        type: n.type
      }
    }

    const angle = ((i - 1) / Math.max(nodes.length - 1, 1)) * 2 * Math.PI
    const dist = 160 + (i % 2) * 60
    return {
      id: n.id,
      label: n.label,
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      type: n.type
    }
  })
}

export function fallbackGraphFromIdea(idea: string): {
  nodes: { id: string; label: string; type: GraphNode["type"] }[]
  edges: { source: string; target: string }[]
} {
  const core = idea.trim().toLowerCase()
  const words = core
    .split(/\s+/)
    .filter(
      w =>
        w.length > 3 &&
        !/^(this|that|with|from|have|will|should|could|would|about|into|through|during|before|after|above|below|between|among|within|without|because|although|however|therefore|moreover|furthermore|nevertheless|nonetheless|meanwhile|otherwise|instead|consequently|accordingly|subsequently|nevertheless|nonetheless)$/i.test(
          w
        )
    )
  const keywords = words.slice(0, 4)

  const nodes: { id: string; label: string; type: GraphNode["type"] }[] = [
    {
      id: "n1",
      label: keywords[0]
        ? keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1)
        : "Research Topic",
      type: "concept"
    }
  ]

  if (keywords[1])
    nodes.push({
      id: "n2",
      label: keywords[1].charAt(0).toUpperCase() + keywords[1].slice(1),
      type: "method"
    })
  if (keywords[2])
    nodes.push({
      id: "n3",
      label: keywords[2].charAt(0).toUpperCase() + keywords[2].slice(1),
      type: "concept"
    })
  if (keywords[3])
    nodes.push({
      id: "n4",
      label: keywords[3].charAt(0).toUpperCase() + keywords[3].slice(1),
      type: "finding"
    })

  const hasData = /dataset|data|benchmark|corpus/.test(core)
  const hasMetric = /accuracy|f1|bleu|rouge|map|score/.test(core)

  if (hasData) nodes.push({ id: "n5", label: "Dataset", type: "literature" })
  else nodes.push({ id: "n5", label: "Approach", type: "method" })

  if (hasMetric) nodes.push({ id: "n6", label: "Evaluation", type: "finding" })
  else nodes.push({ id: "n6", label: "Related Work", type: "literature" })

  const edges: { source: string; target: string }[] = []
  for (let i = 1; i < nodes.length; i++) {
    edges.push({ source: "n1", target: nodes[i].id })
  }
  if (nodes.length >= 4) {
    edges.push({ source: nodes[1].id, target: nodes[nodes.length - 1].id })
  }

  return { nodes, edges }
}
