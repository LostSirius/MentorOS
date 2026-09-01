---
name: brainstorm
description: >-
  Structured ideation assistant that takes raw brainstorm notes, clusters them
  into themes, scores each cluster for research viability, and generates
  concrete research questions. Use when the user provides a list of unstructured
  ideas, wants to "brainstorm", "organize thoughts", "find angles", "generate
  research questions from ideas", or has captured voice notes that need
  structuring.
license: CC-BY-4.0
---

# Brainstorm

## Overview

This skill transforms unstructured idea fragments into actionable research
directions. It ingests raw brainstorm notes (voice transcripts, bullet lists,
half-formed thoughts), clusters them into semantic themes, scores each theme for
research viability, identifies cross-theme synthesis opportunities, and generates
concrete, answerable research questions.

The goal is to help the user move from ideation chaos to structured opportunity
mapping without premature commitment to a single direction.

## When to use this skill

- The user has captured a list of raw ideas via voice or typing and wants them
  organized.
- The user asks to "brainstorm", "organize my thoughts", "find angles", or
  "generate research questions from ideas".
- The user has scattered notes from a reading session and wants to see thematic
  patterns.
- The user wants to compare multiple half-formed ideas before picking one to
  evaluate.
- The user explicitly says "I have some ideas, help me structure them".

## When NOT to use this skill

- The user wants a full paper structure. Redirect to `tech-paper-template` or
  `benchmark-paper-template`.
- The user wants rigorous evaluation of a single well-formed idea. Redirect to
  `idea-evaluator`.
- The user wants review of an existing manuscript. Redirect to
  `pre-submission-reviewer`.
- The user wants AI to generate ideas from scratch without any user-provided
  raw material. Ask the user to supply at least a rough topic or a few seed
  ideas first.

## Core procedure

### Step 1: Ingest raw idea list

Accept all input exactly as provided — fragments, half-sentences, repeated
ideas, and vague hunches are all valid. Do not discard or rephrase at this
stage; capture the raw material faithfully.

If the input contains fewer than 3 distinct ideas, ask the user for more
material before proceeding. The clustering step needs sufficient diversity.

### Step 2: Theme clustering

Group semantically related ideas into 3–7 themes. Each theme must:
- Have a short, descriptive name (2–5 words).
- Contain at least 2 source ideas (or 1 if total input is very small).
- Be justified by explicit evidence from the raw input (cite which bullets
  belong to which theme).

See: references/research-question-types.md for how theme types map to question
families.

### Step 3: Viability scoring

Score each theme on three dimensions (1–10, with one-line rationale):

- **Novelty**: How under-explored is this angle in the literature?
- **Feasibility**: Given typical graduate-student resources, how practical is
  a first study?
- **Excitement**: How likely is this theme to sustain the user's motivation
  over 6–12 months?

### Step 4: Cross-theme synthesis

Identify 1–3 pairs (or triples) of themes that could be combined into stronger
hybrid ideas. For each synthesis:
- Name the hybrid concept.
- Explain why the combination is stronger than either theme alone.
- Flag any increased risk (scope, methodology complexity, etc.).

### Step 5: Research question generation

For the top 2 themes (highest combined novelty + feasibility scores), generate
2–3 concrete, answerable research questions each.

Each question must be:
- Specific enough to guide a single paper or thesis chapter.
- Answerable with empirical methods the user is likely to have access to.
- Not so narrow that the answer is trivial.

See: references/research-question-types.md for question-type taxonomy and
quality criteria.

### Step 6: Quick-priority matrix

Classify each theme into one of three buckets:

- **Pursue now** — strong scores, clear path, user excitement high.
- **Parking lot** — interesting but needs more literature or a prerequisite
  experiment first.
- **Discard** — low scores, already well-covered, or fundamentally infeasible.

### Step 7: Integrity gate

Before emitting output, run the checks in the Integrity gate section below.

### Step 8: Output

Emit the full analysis in the Output format below.

## Integrity gate

Each bullet is tagged with an enforceability class.

1. **[inspection]** Every theme cluster cites specific source bullets; no
   cluster is invented from thin air.
2. **[inspection]** Every generated research question is answerable with
   empirical methods; no question is purely philosophical or unmeasurable.
3. **[inspection]** Viability scores cite concrete evidence from the user's
   input, not generic assumptions.
4. **[inspection]** The priority matrix is consistent with the scores: a
   "Pursue now" theme must have feasibility ≥ 6 and novelty ≥ 5.
5. **[attestation]** Cross-theme synthesis does not invent ideas not present
   in the user's raw input; it only combines and reframes existing fragments.
6. **[user-attest]** The user confirms that the generated questions align
   with their actual research interests and available resources.

If any [inspection] check fails, revise the corresponding output section before
emitting.

## Output format

### 1. Theme clusters

| # | Theme name | Source ideas | Rationale |
|---|---|---|---|
| 1 | ... | bullets #1, #3, #7 | ... |

### 2. Viability scores

| Theme | Novelty | Feasibility | Excitement | Rationale |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

### 3. Cross-theme synthesis

| Hybrid name | Themes combined | Why stronger | Risk flag |
|---|---|---|---|
| ... | ... | ... | ... |

### 4. Research questions

#### Theme: <name>
1. ...
2. ...
3. ...

#### Theme: <name>
1. ...
2. ...
3. ...

### 5. Priority matrix

| Theme | Bucket | Reason |
|---|---|---|
| ... | Pursue now / Parking lot / Discard | ... |

### 6. Next steps

- Immediate action: ...
- Literature to check: ...
- Experiment or prototype to run: ...
