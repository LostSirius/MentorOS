---
name: scientific-feedback
description: >-
  Generates structured peer-review-style scientific feedback on a manuscript
  or section using the review-outline methodology from Liang et al. 2023
  (LLM-scientific-feedback): significance and novelty, reasons for
  acceptance, reasons for rejection, and suggestions for improvement.
  Use when the user asks for paper feedback, peer review, manuscript
  critique, review outline, or scientific comments on a draft.
license: CC-BY-4.0
metadata:
  source: https://github.com/Weixin-Liang/LLM-scientific-feedback
  paper: arXiv:2310.01783
---

# Scientific Feedback (Peer-Review Outline)

## Overview

Produce a high-quality **review outline** for a research manuscript (or
section), following the empirically validated LLM feedback pipeline from
Liang et al., *Can large language models provide useful feedback on research
papers?* (arXiv:2310.01783). Feedback complements human review—especially
useful in early manuscript stages when expert reviewers are scarce.

## When to use

- User asks for paper feedback, peer review, manuscript critique, or review outline
- User pastes title/abstract/sections and wants constructive scientific comments
- Drafting canvas needs reviewer-style critiques (not just prose polish)
- Pre-submission pass focused on scientific claims (pair with pre-submission-reviewer for writing/LaTeX)

## When NOT to use

- Idea not yet written as paper text → use idea-evaluator
- Only grammar/tone polish → use paper-polish
- Full pre-deadline mechanical audit → use pre-submission-reviewer

## Core procedure

### Step 1: Ingest manuscript slices

Accept whatever the user provides among:

- title
- abstract
- figure/table captions
- main content (introduction, methods, experiments, discussion, …)

If content is very long, prioritize abstract + captions + introduction +
methods/experiments claims. Never invent missing experimental numbers.

### Step 2: Draft the review outline

Start with exactly:

```
Review outline:
```

Then produce these sections:

1. **Significance and novelty**
   - What problem is addressed and why it matters
   - What is new relative to prior work (be concrete; say if novelty is unclear)

2. **Potential reasons for acceptance**
   - 3–5 strengths a top-venue reviewer might cite

3. **Potential reasons for rejection**
   - List **4 key reasons**
   - For **each** reason, use **≥2 sub-bullet points** with painstaking detail
   - Prefer method-design depth over generic “add more datasets” when evidence allows

4. **Suggestions for improvement**
   - List **4 key suggestions**, actionable and prioritized

### Step 3: Tone and quality bar

- Be thoughtful and constructive; no ad-hominem
- Prefer specific claims tied to the manuscript text
- Flag when the draft lacks evidence for a claim
- Avoid over-focusing only on “more experiments / more datasets” if method
  design, theory, or clarity are the real bottlenecks
- Write **outlines only** (structured review), not a full rewritten paper

## Output format

Plain-text review outline with the four numbered sections above.
When a JSON contract is supplied by the host application, map:

- acceptance strengths → `praise`
- rejection reasons → `issue`
- improvement suggestions → `suggestion`

and keep scientific substance from this procedure.
