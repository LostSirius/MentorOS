# Third-party notices

This document records third-party material and license boundaries in MentorOS.
It is informational and is not legal advice.

## License scope and precedence

The PolyForm Noncommercial License in the repository root applies only to
original MentorOS contributions, except where a file or component says
otherwise. Third-party and adapted material remains under its own license.
Component-level notices and license files take precedence for that component.

## Material included or adapted

### Supervisor-Skills

- Source: [HKUSTDial/Supervisor-Skills](https://github.com/HKUSTDial/Supervisor-Skills)
- Copyright notice: Copyright (c) 2026 Yuyu Luo (methodology) and contributors.
- Repository license: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- MentorOS use: selected runtime skills are copied or adapted under
  `src/backend/plugins/phd-research/skills/`.
- Changes: relocation into the MentorOS plugin layout, metadata and prompt
  adjustments, and integration with structured module handoffs and integrity gates.

Individual upstream skill files may state a more specific license, including
CC BY 4.0 or CC BY-NC-SA 4.0. The per-skill metadata and
[`skills/ATTRIBUTION.md`](../src/backend/plugins/phd-research/skills/ATTRIBUTION.md)
identify the applicable license. ShareAlike material is not relicensed under
PolyForm.

### LLM-scientific-feedback

- Source: [Weixin-Liang/LLM-scientific-feedback](https://github.com/Weixin-Liang/LLM-scientific-feedback)
- Paper: [Liang et al., arXiv:2310.01783](https://arxiv.org/abs/2310.01783)
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- MentorOS use: the review-outline procedure and prompt are adapted in
  `src/backend/plugins/phd-research/skills/scientific-feedback/SKILL.md` and
  `src/frontend/lib/scientific-feedback.ts`.
- Changes: text-only input, MentorOS JSON mapping, evidence constraints, and
  human-in-the-loop review behavior.

### Chatbot UI

- Source: [mckaywrigley/chatbot-ui](https://github.com/mckaywrigley/chatbot-ui)
- License audit snapshot:
  [`81328b6`](https://github.com/mckaywrigley/chatbot-ui/commit/81328b61d2a4ab597a7a057be70e785cf756d9f8)
- License: MIT
- MentorOS use: historical frontend foundation, substantially modified for the
  research workbench.

```text
MIT License

Copyright (c) 2024 Mckay Wrigley

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Draw.io reconstruction / VCG-Bench

The `drawio-reconstruction` component carries its own MIT license and copyright
notice at
[`src/backend/plugins/phd-research/skills/drawio-reconstruction/LICENSE`](../src/backend/plugins/phd-research/skills/drawio-reconstruction/LICENSE).
Its companion project is [VCG-Bench](https://github.com/sxy1499894281/VCG-Bench).
The audited upstream snapshot is
[`7bd7918`](https://github.com/sxy1499894281/VCG-Bench/commit/7bd7918794d01ca978955fe349d95e7c058522ab).

## Evaluated integration excluded from distribution

### clawd-on-desk

- Source: [rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk)
- Source-code license: AGPL-3.0.
- Artwork status: `assets/LICENSE` in the upstream repository states
  **All Rights Reserved**.
- MentorOS boundary: no upstream source code, downloader, bridge implementation,
  or Clawd SVG artwork is committed. The shipped `qpack/claude/` mascot is a
  separate MentorOS asset and does not use Clawd artwork.

## Methodology references with no copied files

These sources informed high-level workflows or risk controls. MentorOS does not
vendor their repositories:

| Source | License observed on 2026-09-01 | MentorOS boundary |
| --- | --- | --- |
| [nature-skills](https://github.com/Yuan1z0825/nature-skills) | Apache-2.0 | Conceptual reference only. |
| [AI-Research-SKILLs](https://github.com/Orchestra-Research/AI-Research-SKILLs) | MIT | Conceptual reference only. |
| [Auto-Empirical-Research-Skills](https://github.com/brycewang-stanford/Auto-Empirical-Research-Skills) | CC BY-SA 4.0 | Conceptual reference only; no skill files copied. |
| [AI-Scientist](https://github.com/SakanaAI/AI-Scientist) | AI Scientist Source Code License 1.0 (December 2025) | Workflow and failure-mode reference only; no source code copied. |
| [academic-research-skills](https://github.com/imbad0202/academic-research-skills) | CC BY-NC 4.0 | Conceptual reference only. |

The [Sakana AI Nature announcement](https://sakana.ai/ai-scientist-nature/) is
background reading only; its text and artwork are not included.

## Reviewed but not used

- [Academic-MCP](https://github.com/Heisenbear-Rebirth/Academic-MCP):
  no license was declared when checked on 2026-09-01. No content is copied.
- [SkillsMP](https://skillsmp.com/skills): discovery index only. Each listed
  skill has its own upstream author and license and must be audited separately.

See [`REFERENCES.md`](REFERENCES.md) for the complete provenance classification.
