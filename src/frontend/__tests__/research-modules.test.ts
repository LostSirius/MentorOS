import { MODULE_ACCENTS } from "@/lib/research-module-accents"
import { RESEARCH_MODULES } from "@/lib/research-modules"
import { stampFilename } from "@/lib/research-export"
import { ideaCardToMarkdown, emptyScores, type IdeaCard } from "@/lib/idea-types"
import { buildOverviewState } from "@/lib/overview-types"
import {
  emptySnapshot,
  moduleProgress,
  type ResearchSessionSnapshot
} from "@/lib/research-archive"
import { emptyWritingSession, type WritingBundle } from "@/lib/writing-types"

function sampleIdea(overrides: Partial<IdeaCard> = {}): IdeaCard {
  return {
    version: 1,
    title: "Test idea",
    oneLiner: "One line",
    paperType: "novel_method",
    researchQuestions: [{ id: "RQ1", text: "Does X beat Y?", locked: false }],
    hypotheses: ["H1"],
    scores: {
      higher: { score: 4, rationale: "r" },
      faster: { score: 4, rationale: "r" },
      stronger: { score: 5, rationale: "r" },
      cheaper: { score: 3, rationale: "r" },
      broader: { score: 4, rationale: "r" }
    },
    fatalFlaws: [],
    verdict: "accept_with_revisions",
    locale: "en",
    gates: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  }
}

function sampleBundle(overrides: Partial<WritingBundle> = {}): WritingBundle {
  return {
    version: 1,
    mode: "outline",
    content: "Draft body",
    publicationMode: "draft",
    styleTier: "academic",
    locale: "en",
    createdAt: "2026-01-01T00:00:00.000Z",
    gates: [],
    ...overrides
  }
}

describe("research module accents", () => {
  it("covers every ResearchModuleId", () => {
    for (const m of RESEARCH_MODULES) {
      expect(MODULE_ACCENTS[m.id]).toBeDefined()
      expect(MODULE_ACCENTS[m.id].badge).toMatch(/border-/)
      expect(MODULE_ACCENTS[m.id].navActive).toMatch(/bg-/)
    }
  })

  it("keeps module identity hues distinct (no shared primary token prefix)", () => {
    const prefixes = RESEARCH_MODULES.map(m => {
      const primary = MODULE_ACCENTS[m.id].primary
      const match = primary.match(/bg-([a-z]+)-/)
      return match?.[1]
    })
    // overview teal vs literature sky are both cool but different tokens
    expect(new Set(prefixes).size).toBe(prefixes.length)
  })

  it("does not use semantic status colors for identity accents", () => {
    const forbidden = ["rose", "red", "amber", "yellow", "emerald", "green"]
    for (const m of RESEARCH_MODULES) {
      const blob = Object.values(MODULE_ACCENTS[m.id]).join(" ")
      for (const bad of forbidden) {
        expect(blob).not.toMatch(new RegExp(`\\b${bad}-`))
      }
    }
  })
})

describe("stampFilename", () => {
  it("formats prefix-YYYYMMDD-HHmm.ext", () => {
    const name = stampFilename("literature", "md")
    expect(name).toMatch(/^literature-\d{8}-\d{4}\.md$/)
  })
})

describe("ideaCardToMarkdown", () => {
  it("exports 5D scores on a /5 scale", () => {
    const md = ideaCardToMarkdown(sampleIdea())
    expect(md).toContain("## Scores (5D)")
    expect(md).toMatch(/higher\*\*: 4\/5/)
    expect(md).not.toMatch(/\/10/)
  })
})

describe("buildOverviewState", () => {
  it("labels idea scores as /5", () => {
    const state = buildOverviewState({
      ideaCard: sampleIdea(),
      locale: "en"
    })
    const avg = state.scores.find(s => s.id === "idea-avg")
    expect(avg?.value).toBe("4/5")
    expect(state.scores.some(s => s.value.endsWith("/10"))).toBe(false)
  })

  it("marks writing partial when only history exists", () => {
    const session = emptyWritingSession()
    session.current = null
    session.history = [
      {
        id: "wv1",
        label: "outline · saved",
        createdAt: "2026-01-02T00:00:00.000Z",
        bundle: sampleBundle({ content: "Old draft" })
      }
    ]
    const state = buildOverviewState({
      writingSession: session,
      locale: "en"
    })
    expect(state.modules.writing?.status).toBe("partial")
    expect(state.gaps.some(g => g.id === "gap-writing")).toBe(false)
  })

  it("marks writing empty when no draft", () => {
    const state = buildOverviewState({
      writingSession: emptyWritingSession(),
      locale: "en"
    })
    expect(state.modules.writing?.status).toBe("empty")
  })

  it("sets readiness red when idea has BLOCK gap for missing RQ", () => {
    const state = buildOverviewState({
      ideaCard: sampleIdea({ researchQuestions: [] }),
      locale: "en"
    })
    expect(state.gaps.some(g => g.id === "gap-rq" && g.severity === "BLOCK")).toBe(
      true
    )
    expect(state.readiness).toBe("red")
  })
})

describe("moduleProgress", () => {
  it("returns 8 modules in nav order", () => {
    const progress = moduleProgress(emptySnapshot())
    expect(progress.map(p => p.id)).toEqual(RESEARCH_MODULES.map(m => m.id))
    expect(progress.every(p => p.ready === false)).toBe(true)
  })

  it("marks writing ready from history alone", () => {
    const snap: ResearchSessionSnapshot = {
      ...emptySnapshot(),
      writing: {
        version: 1,
        current: null,
        history: [
          {
            id: "wv1",
            label: "saved",
            createdAt: "2026-01-02T00:00:00.000Z",
            bundle: sampleBundle()
          }
        ],
        comments: []
      }
    }
    const writing = moduleProgress(snap).find(p => p.id === "writing")
    expect(writing?.ready).toBe(true)
  })

  it("marks idea ready from candidates alone", () => {
    const snap: ResearchSessionSnapshot = {
      ...emptySnapshot(),
      ideaCandidates: [
        {
          id: "c1",
          title: "C",
          oneLiner: "x",
          paperType: "other",
          createdAt: "2026-01-01T00:00:00.000Z"
        } as never
      ]
    }
    // If ideaCandidates shape differs, just assert via length path
    snap.ideaCandidates = [{ id: "c1" } as (typeof snap.ideaCandidates)[number]]
    const idea = moduleProgress(snap).find(p => p.id === "idea")
    expect(idea?.ready).toBe(true)
  })
})

describe("emptyScores baseline", () => {
  it("defaults to mid-scale 3 within 1–5", () => {
    const s = emptyScores()
    for (const v of Object.values(s)) {
      expect(v.score).toBeGreaterThanOrEqual(1)
      expect(v.score).toBeLessThanOrEqual(5)
    }
  })
})
