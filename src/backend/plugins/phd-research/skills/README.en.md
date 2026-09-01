# MentorOS runtime research skills

This directory contains the research skills loaded silently by the MentorOS
backend. It is not a mirror or standalone distribution of the upstream
Supervisor-Skills repository.

> This is a multi-license directory. Several skills are adapted directly from
> [HKUSTDial/Supervisor-Skills](https://github.com/HKUSTDial/Supervisor-Skills),
> and the scientific-feedback procedure is adapted from
> [LLM-scientific-feedback](https://github.com/Weixin-Liang/LLM-scientific-feedback).
> Read [`ATTRIBUTION.md`](ATTRIBUTION.md) before use or redistribution.

## Skill map

| MentorOS module | Runtime skills |
| --- | --- |
| Literature | `literature-review` · `deep-research` |
| Idea | `brainstorm` · `idea-evaluator` |
| Experiment | `benchmark-paper-template` |
| Writing | `paper-writer` · `intro-drafter` · `tech-paper-template` |
| Figures | `figure-designer` · `drawio-reconstruction` |
| Review | `pre-submission-reviewer` · `scientific-feedback` |
| Polish | `paper-polish` |
| Cross-cutting | `vibe-research-workflow` |

Frontend and backend resolvers select these skills silently from the active
research module and user intent. The product UI does not expose skill names or
a skill marketplace. The canonical module contracts live in
[`docs/distill/`](../../../../../docs/distill/README.md).

## Licenses and provenance

- Per-skill map: [`ATTRIBUTION.md`](ATTRIBUTION.md)
- Reference classification: [`docs/REFERENCES.md`](../../../../../docs/REFERENCES.md)
- Third-party notices: [`docs/THIRD_PARTY_NOTICES.md`](../../../../../docs/THIRD_PARTY_NOTICES.md)
- Original MentorOS contributions: [`LICENSE`](../../../../../LICENSE)

Before adding or modifying a skill, read the
[contribution guide](../../../../../.github/CONTRIBUTING.md) and preserve its
upstream source, license, and modification notice.

[中文](README.md)
