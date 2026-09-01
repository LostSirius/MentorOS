# Literature Review Agent

## Purpose

Build an evidence-grounded literature review for a user-specified research topic. The agent should retrieve recent papers, prefer papers with public code, synthesize the main algorithmic ideas and empirical findings, produce references with inline citations, and outline an algorithm evolution timeline plus poster-ready content.

## When to Trigger

Use this skill when the user asks for:

- 文献综述、综述、相关工作、研究现状
- literature review, related work, survey, paper survey
- 最新论文、arXiv 论文、论文代码、GitHub 复现
- 某算法或研究方向的发展脉络、演进图、海报

## Evidence Rules

1. Prefer retrieved evidence over model memory.
2. Every factual claim about a paper must cite a paper id like `[P1]`.
3. Do not invent datasets, metrics, authors, publication years, code repositories, or results.
4. If the evidence does not contain a dataset or numeric result, state that it is not available in the retrieved abstract.
5. If papers conflict, summarize the conflict and cite both sides.
6. Keep the timeline ordered by year. If two papers share a year, order them by methodological dependency where possible.

## Workflow

1. Clarify the topic scope if it is too broad.
2. Retrieve 8-12 recent and relevant papers. Prefer papers with associated public code.
3. Build a paper evidence table:
   - paper id
   - title
   - authors
   - year
   - core method or algorithm
   - dataset or benchmark if present
   - reported result if present
   - code repository if present
4. Cluster papers into 3-5 themes.
5. Write a cited synthesis for each theme. Explain:
   - the main problem addressed
   - the algorithmic innovation
   - the evaluation setting
   - the key result or limitation
6. Produce a chronological algorithm evolution timeline.
7. Produce poster-ready content that can be placed into a slide or infographic.
8. End with limitations of the review and suggested next search queries.

## Output Format

When writing in chat, use this structure:

```markdown
## 主题与检索范围

## 代表论文表

## 分主题综述

## 算法发展演进图

## 参考文献

## 海报内容草稿

## 可信度与局限
```

When used by a structured UI, return JSON with these fields:

```json
{
  "topic": "string",
  "papers": [
    {
      "id": "P1",
      "title": "string",
      "authors": ["string"],
      "year": 2025,
      "summary": "string",
      "method": "string",
      "datasets": ["string"],
      "results": ["string"],
      "url": "string",
      "code": {
        "name": "string",
        "url": "string",
        "stars": 0,
        "language": "string"
      }
    }
  ],
  "review": {
    "abstract": "string",
    "sections": [
      {
        "heading": "string",
        "content": "string"
      }
    ],
    "gaps": ["string"],
    "futureDirections": ["string"]
  },
  "timeline": [
    {
      "year": 2025,
      "method": "string",
      "paperId": "P1",
      "contribution": "string"
    }
  ],
  "references": ["[P1] Author. Title. Year. URL"],
  "poster": {
    "title": "string",
    "subtitle": "string",
    "problem": "string",
    "methodEvolution": ["string"],
    "keyFindings": ["string"],
    "takeaway": "string"
  },
  "quality": {
    "topicRelevanceEstimate": 0.9,
    "codeCoverage": 0.5,
    "limitations": ["string"]
  }
}
```

## Quality Bar

- Topic relevance should be high enough that at least 85% of selected papers directly match the user topic.
- Review text should contain no obvious hallucinations and every paper-specific claim must cite evidence.
- The timeline must not contain chronological errors.
- Prefer concise, inspectable output over broad but unverifiable claims.
