# Source · Supervisor-Skills

- Repo: https://github.com/HKUSTDial/Supervisor-Skills
- License: CC BY-NC-SA 4.0 at repository level; individual skills may declare
  CC BY 4.0, CC BY-NC-SA 4.0, or a component-specific license
- Relationship: direct integration / adaptation
- Local vendor: `_vendor/Supervisor-Skills`
- Runtime skills: `src/backend/plugins/phd-research/skills/`
- Attribution map: `src/backend/plugins/phd-research/skills/ATTRIBUTION.md`

## Skills → Modules

| Skill | Module |
|-------|--------|
| deep-research, literature-review | Literature |
| brainstorm, idea-evaluator | Idea |
| benchmark-paper-template, tech-paper-template | Experiment / Writing structure |
| paper-writer, intro-drafter | Writing（从零撰写） |
| paper-polish | Polish（初稿润色 / 改稿） |
| figure-designer, drawio-reconstruction | Figures |
| pre-submission-reviewer | Review |
| vibe-research-workflow | Cross-cutting HITL |
| scientific-feedback | Review（主）· Polish revise_feedback（辅） |

## Operational extracts (already in shared/)
- Evidence hierarchy + map → `shared/evidence-discipline.md`
- F1–F10 → `shared/fatal-flaws.md`
- Five dimensions → `shared/five-dimensions.md`
- Vibe six rules → `shared/human-in-the-loop.md`
- Deep research 6 gates → `shared/integrity-gates.md` G3
- Figure QC → `modules/figures.md`

## Implementation note
Prefer loading existing `SKILL.md` via silent resolver; shared distill files are the **product contract** when UI/API diverge from upstream wording.
