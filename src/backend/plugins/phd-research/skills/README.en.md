# Skills: a reader's guide to the eight executable skills

English · [中文](README.md)

If you clicked into this folder, you probably want to know what the "executable core" of Supervisor-Skills actually is. This README is written for you: **use it as a structured research checklist without the plugin, and as a map to what each skill does, when to trigger it, and how the skills chain together when you do install the plugin.**

## Where this README sits in the project

Supervisor-Skills is layered by audience:

| Entry point | Audience | Purpose |
|---|---|---|
| Top-level [`README.en.md`](../../../README.en.md) | First-time visitors | Why the project exists, tutorial structure, how to install |
| [`handbook/`](../../../handbook/) (Chinese, canonical) / [`docs/en/handbook/`](../../../docs/en/handbook/) (English mirror) | Readers who want the methodology | Six chapters of research and writing handbook (the theoretical spine) |
| **This file** | Readers who want the skills directly | **What each of the 7 skills is, when to use it, how it chains with the others** |
| `SKILL.md` (inside each skill directory) | The plugin / LLMs | Executable spec: integrity gates, output formats, mode options — machine-readable, not optimised for human browsing |

In one line: **the handbook teaches the way, SKILL.md runs the tool, this README is the bridge between them.**

## Two narrative tracks: technical paper vs benchmark paper

The seven skills are not seven isolated tools. They map to two complete lifecycles of a top-venue paper. Locate yourself on the right track first, then pick the skill you need.

### Track 1: technical / position paper (new method for an existing problem)

Following the natural order a PhD student takes for their first top-venue paper:

1. **[idea-evaluator](idea-evaluator/SKILL.md)** — before committing months to an idea, run the reviewer-grade vetting; cut weak ideas early and sharpen the promising ones
2. **[tech-paper-template](tech-paper-template/SKILL.md)** — before writing any prose, lock the full logical skeleton of the paper
3. **[intro-drafter](intro-drafter/SKILL.md)** — translate the skeleton into a six-paragraph Introduction outline
4. **[figure-designer](figure-designer/SKILL.md)** — design the three load-bearing figures: Motivated Example, Solution Overview, Experimental Results
5. **[pre-submission-reviewer](pre-submission-reviewer/SKILL.md)** — the 3-to-5-day deadline-window audit

**Cross-cutting tool**: [vibe-research-workflow](vibe-research-workflow/SKILL.md) is **orthogonal** to the five steps above, not step 6. Whether you are coding, drawing, or writing at any stage, it gives you AI-collaboration rules and tool picks.

### Track 2: benchmark / evaluation paper

The benchmark pipeline is more strictly sequential than the technical-paper track: each stage gates the next. **[benchmark-paper-template](benchmark-paper-template/SKILL.md)** is the orchestrator for this track: a single skill bundles the full six-stage workflow (Gap → Design → Construction → Experiments → Paper Structure → Checklist) and produces the five-pillar framework (Research Gap, Construction Pipeline, Evaluation Framework, Empirical Findings, optional Companion Method).

For a benchmark paper, the starting and ending point are both this one skill; only the two core figures additionally need figure-designer, and the pre-submission audit still lands on pre-submission-reviewer.

### Already stuck somewhere?

Readers with a specific bottleneck can skip the reading order and jump straight to the relevant skill:
- Not confident about greenlighting an idea → **idea-evaluator**
- Introduction reads like a set of disconnected claims → **intro-drafter**
- Methodology section will not flow → **tech-paper-template**
- Figures look clumsy, not sure which tool to use → **figure-designer**
- Pre-submission panic, unclear what to check → **pre-submission-reviewer**
- Cannot articulate the benchmark gap or organise evaluation dimensions → **benchmark-paper-template**
- Unsure how to delegate to AI without diluting academic judgment → **vibe-research-workflow**

## The seven skill cards

Each card translates the SKILL.md spec into plain-reader language, adds the matching handbook chapters, and notes the upstream/downstream skills.

### idea-evaluator — pre-submission vetting for your idea

- **Positioning**: externalises the implicit check that experienced advisors run silently when a student proposes an idea, into four layers of reviewable gates.
- **When to trigger**:
  - Student proposes an idea and wants to know, before committing months, whether it is worth pursuing
  - Reviewer-style self-audit: is this already covered by prior work; does it land cleanly on Higher / Faster / Stronger / Cheaper / Broader; does the student's capability and timeline fit
  - Rough-filter a list of ideas, keep the top three, cut the rest
- **Four layers**: fatal-flaws audit (early short-circuit) → idea lifecycle and student capability matching → five-dimension scoring (Higher, Faster, Stronger, Cheaper, Broader) → paradigm-shift probe plus feasibility. The order matters — a seven-out-of-ten "Higher" score means nothing if a CRITICAL fatal flaw is sitting underneath it.
- **Output**: evidence-grounded scores on every axis, severity tagging (CRITICAL / MAJOR / MINOR), and a verdict of "Reject and Pivot" or "Proceed with Guardrails".
- **Matching handbook chapters**: [2.1 Idea lifecycle](../../../docs/en/handbook/02_Idea_Generation/2.1_idea-lifecycle-and-capability-matching.md) · [2.2 Higher-Faster-Stronger](../../../docs/en/handbook/02_Idea_Generation/2.2_higher-faster-stronger.md) · [2.3 Disruptive innovation](../../../docs/en/handbook/02_Idea_Generation/2.3_disruptive-innovation.md)
- **Downstream**: once the idea passes, hand off to **tech-paper-template** to lock the skeleton. When the paradigm probe flags disruptive potential, read handbook 2.3 first.

### tech-paper-template — the logical skeleton before you write

- **Positioning**: forces alignment across Background, Limitations, Key Idea / Goal, Challenges, Methodology Modules, and Contributions, via a thinking-template table.
- **When to trigger**:
  - The idea has passed evaluation; before any prose, you want the story straight
  - Co-authors disagree on whether module X belongs — let the table arbitrate
  - Halfway through drafting you notice the method does not actually respond to the motivation — come back to the table and reshuffle
- **Key discipline**: choose the paper's **positioning type** once (technical / position paper vs new-problem / new-setting paper); enforce the challenge-to-module one-to-one mapping with at most three entries; every contribution bullet must cite the section that delivers it.
- **Output**: a completed thinking-template table + self-consistency audit (the "challenge—module—contribution" three-way interlock) + structured input ready for intro-drafter.
- **Matching handbook chapters**: [3.1 Essentials of a research paper](../../../docs/en/handbook/03_Paper_Writing/3.1_the-essentials-of-a-research-paper.md) · [3.3 Technical paper template](../../../docs/en/handbook/03_Paper_Writing/3.3_technical-paper-template.md)
- **Up- and downstream**: upstream is **idea-evaluator**; downstream is **intro-drafter** (turn the skeleton into a six-paragraph outline) and **figure-designer** (fix the Solution Overview figure around the module graph).

### intro-drafter — the six-paragraph Introduction outline

- **Positioning**: makes the five cross-paragraph logical chains inside Introduction explicit and auditable: Background, Limitations, Goal, Challenges, Solution Overview, Contributions.
- **When to trigger**:
  - The tech-paper-template skeleton is done; you are ready to start the Introduction
  - A co-author says "your Intro reads like a pile of unrelated claims" — usually one of the chains snapped
  - You want to check whether every contribution bullet cites an actual section
- **Six paragraphs**: background with a running example · limitations (at most three) · problem essence and goal · key challenges (at most three) · solution overview (modules map one-to-one to the challenges) · numbered contributions that cite the sections delivering them.
- **Output**: the outline with chain annotations + a Flowchart consistency report + a positioning note (technical vs new-problem paper) that tells you whether paragraph 3 is a light bridge or a load-bearing argument.
- **Matching handbook chapter**: [3.2 Introduction writing flowchart](../../../docs/en/handbook/03_Paper_Writing/3.2_introduction-writing-flowchart.md)
- **Up- and downstream**: upstream is **tech-paper-template**; downstream is **figure-designer** (the Running Example from paragraph 1 becomes the Motivated Example figure).

### benchmark-paper-template — the all-in-one orchestrator for benchmark papers

- **Positioning**: built specifically for benchmark / evaluation papers; bundles the five-pillar framework (Research Gap, Construction Pipeline, Evaluation Framework, Empirical Findings, optional Companion Method) plus the six-stage workflow into a single skill.
- **When to trigger**:
  - Starting a benchmark project, thinking from "why does this benchmark need to exist"
  - Data has been collected, but the evaluation dimensions are fuzzy
  - Experiments are done; unclear whether each Finding-X insight is deep enough
  - Working through the benchmark-paper checklist before submission
- **Six stages**: Gap Analysis → Design → Construction Pipeline → Experiments → Paper Structure → Checklist. The skill **first detects the current stage**, then routes to the relevant thinking support.
- **Output**: per-stage deliverables + a six-part Introduction logic chain + a Section 2-7 skeleton + a pre-submission checklist.
- **Matching handbook chapters**: [3.4 Benchmark and evaluation paper template](../../../docs/en/handbook/03_Paper_Writing/3.4_benchmark-paper-template.md) · [6.3 LEAD writing analysis](../../../docs/en/handbook/06_Case_Studies/6.3_vldb2026-lead-analysis.md)
- **Cross-link**: figure-designer (the two core figures) · pre-submission-reviewer (final audit).

### figure-designer — the design advisor for the three load-bearing figures

- **Positioning**: focuses on the three figures that carry the narrative weight of a technical paper — Motivated Example (Figure 1), Solution Overview (methodology), and Experimental Results — with design paradigms, layout rules, and tool-selection guidance.
- **When to trigger**:
  - Introduction outline is locked; you need to turn paragraph 1's Running Example into Figure 1
  - Before writing the methodology, decide how the Solution Overview figure should partition the module graph
  - Experiments are done, the main table is crowded, and a figure would tell the story better
  - Torn between PowerPoint, TikZ, and Inkscape
- **Key principles**: one figure says one thing; axis / legend / palette at top-venue aesthetic standards; the Experimental Results figure must speak directly back to the Introduction's motivation.
- **Output**: per-figure design notes, common anti-patterns, tool picks, and reusable layout templates.
- **Matching handbook chapters**: [4.1 Motivated example figure](../../../docs/en/handbook/04_Scientific_Plotting/4.1_motivated-example-figure.md) · [4.2 Solution overview figure](../../../docs/en/handbook/04_Scientific_Plotting/4.2_solution-overview-figure.md) · [4.3 Experimental results figure](../../../docs/en/handbook/04_Scientific_Plotting/4.3_experimental-results-figure.md) · [4.4 Plotting checklist](../../../docs/en/handbook/04_Scientific_Plotting/4.4_plotting-checklist-and-tools.md)
- **Up- and downstream**: upstream is **intro-drafter** (running example locks Figure 1) and **tech-paper-template** (module graph locks the Solution Overview figure); downstream is **pre-submission-reviewer** (figure quality is part of the final audit).

### pre-submission-reviewer — the top-venue reviewer's final audit

- **Positioning**: simulates a top-venue reviewer and audits a draft across five dimensions: macro logic, writing details, English grammar, LaTeX formatting, figure quality.
- **When to trigger**:
  - 3 to 5 days before the submission deadline, running the final pass
  - Co-authors have stopped making suggestions; you need a cold-eyed full audit
  - Rebuttal is drafted; you want another sweep against the "things reviewers will flag" catalogue
- **Methodology**: severity tagging (CRITICAL / MAJOR / MINOR) + reviewer-style writing checklist + high-frequency English pitfalls + common LaTeX formatting mistakes.
- **Output**: a severity-ranked defect list, each item paired with an actionable fix, with a clear **subset that is realistically fixable in 72 hours** called out.
- **Matching handbook chapters**: [3.5 Writing details and checklist](../../../docs/en/handbook/03_Paper_Writing/3.5_writing-details-and-checklist.md) · [1.1 How to evaluate paper quality](../../../docs/en/handbook/01_Preliminary/1.1_how-to-evaluate-paper-quality.md)
- **Upstream**: the endpoint of the technical-paper track; also the endpoint of the benchmark-paper track.

### vibe-research-workflow — the always-on rules for AI-assisted research

- **Positioning**: a full-lifecycle guide for AI-assisted research, covering three sub-flows: Vibe Coding, Vibe Figure, Vibe Writing.
- **When to trigger**:
  - First time using Claude / Cursor / Codex to help with research code, unclear where the human-AI boundary is
  - Drawing a figure and torn between "let AI generate it" and "draw it yourself"
  - Worried the LLM is ghost-writing away your academic taste
  - The output feels like "the AI is winging it" — usually the behavioural rules are not aligned
- **Core principle**: **keep academic judgment in the human's hands, delegate mechanical labour to AI**; every AI output must come with checkable evidence; tool picks are per task type with a concrete shortlist.
- **Output**: a recommended tool chain for the current scenario, a human-AI division-of-labour sketch, and a common-failure-mode catalogue.
- **Matching handbook chapters**: [5.1 Vibe Research and Vibe Coding primer](../../../docs/en/handbook/05_Vibe_Research/5.1_vibe-research-and-vibe-coding.md) · [5.2 Practitioner notes](../../../docs/en/handbook/05_Vibe_Research/5.2_liboyan-practical-notes.md)
- **How it fits**: **orthogonal** to the other six skills. It is not step N; it is a rulebook you pull up at any step.

## How to actually use these skills

### With the Claude plugin installed (recommended)

Follow the [Quick Start](../../../README.en.md#quick-start) in the top-level README. Once installed, natural language triggers are enough, no commands to memorise. The following phrasings route to the matching skill:

- "help me evaluate this idea" → `idea-evaluator`
- "lock the paper's logical skeleton for me" → `tech-paper-template`
- "draft the Introduction / I want to write the intro" → `intro-drafter`
- "how should I draw this figure / what tool should I use" → `figure-designer`
- "review the paper before I submit / final pass" → `pre-submission-reviewer`
- "I am writing a benchmark paper / I am doing an evaluation paper" → `benchmark-paper-template`
- "how do I use AI to assist my research" → `vibe-research-workflow`

### Without the plugin

Every `SKILL.md` is itself a readable, structured thinking checklist. You can:
- Paste SKILL.md into any AI assistant you use (Claude, GPT, DeepSeek, Kimi, and similar) as a system prompt
- Or treat it as a **static checklist** — no AI needed; pen, paper, and the section list are enough

Each skill's `references/` directory carries on-demand depth. For example, `idea-evaluator/references/five-dimensions.md` is the full expansion of the Higher-Faster-Stronger-Cheaper-Broader framework.

## Skill-to-handbook cross reference

| Skill | Main handbook chapters |
|---|---|
| idea-evaluator | 2.1 / 2.2 / 2.3 |
| tech-paper-template | 3.1 / 3.3 |
| intro-drafter | 3.2 |
| benchmark-paper-template | 3.4 / 6.3 |
| figure-designer | 4.1 / 4.2 / 4.3 / 4.4 |
| pre-submission-reviewer | 3.5 / 1.1 |
| vibe-research-workflow | 5.1 / 5.2 |

**Recommended reading order: read the handbook once to build intuition about the "way", then come back to this README to pick the skill for your scenario; leave execution to SKILL.md.**

## Contributing and feedback

New skills, SKILL.md revisions, reference additions, or top-venue papers you wrote with these skills are all welcome. Please read the top-level [CONTRIBUTING.md](../../../CONTRIBUTING.md) first; the hard rules for new skills live there.

For questions, feedback, or to bring Supervisor-Skills to your own lab, please email Yuyu Luo at yuyuluo [AT] hkust-gz.edu.cn.

---

[English] | [中文](README.md)
