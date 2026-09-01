# Third-party integrations

This page describes operational integrations. For the complete classification
of all reviewed sources, see [`REFERENCES.md`](REFERENCES.md). License terms and
required attribution are recorded in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Supervisor-Skills (HKUSTDial)
- Upstream: https://github.com/HKUSTDial/Supervisor-Skills
- Live procedures: `src/backend/plugins/phd-research/skills/`
- Wired silently into chat detect, canvas modes, literature review, drafting, and selection actions
- Do not surface skill names in the product UI
- License map: `src/backend/plugins/phd-research/skills/ATTRIBUTION.md`

## LLM-scientific-feedback (Liang et al., arXiv:2310.01783)
- Upstream: https://github.com/Weixin-Liang/LLM-scientific-feedback
- Review-outline methodology: `scientific-feedback` skill + `src/frontend/lib/scientific-feedback.ts`
- API: `POST /api/scientific-feedback` (text-based; no ScienceBeam PDF dependency on Windows)
- Drafting canvas "Peer-review draft" and selection "Ask Supervisor" use this pipeline

## Desktop pet — excluded Clawd integration

MentorOS evaluated https://github.com/rullerzhou-afk/clawd-on-desk but does not
integrate its code or artwork. Upstream Clawd artwork is All Rights Reserved, so
the earlier local fetch and bridge path was removed. The shipped
`pets/qpack/claude/` mascot is a separate MentorOS asset.

## Research-method references

The following projects inform the distill specifications but are not runtime
integrations: nature-skills, AI-Research-SKILLs, Auto-Empirical-Research-Skills,
AI-Scientist, and academic-research-skills. Their exact absorption boundaries
are documented in `docs/distill/sources/`.

Academic-MCP is not currently used. SkillsMP is a discovery index rather than
a content source. The Sakana AI Nature announcement is background reading.

## Attribution requirement

Preserve the repository and component notices when redistributing MentorOS.
When publishing research that materially relies on an upstream procedure, cite
the original paper or repository.
