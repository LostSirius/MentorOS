# Third-party research procedures integrated into MentorOS

## Supervisor-Skills (HKUSTDial)
- Upstream: https://github.com/HKUSTDial/Supervisor-Skills
- Live procedures: `src/backend/plugins/phd-research/skills/`
- Wired silently into chat detect, canvas modes, literature review, drafting, and selection actions
- Do not surface skill names in the product UI

## LLM-scientific-feedback (Liang et al., arXiv:2310.01783)
- Upstream: https://github.com/Weixin-Liang/LLM-scientific-feedback
- Review-outline methodology: `scientific-feedback` skill + `src/frontend/lib/scientific-feedback.ts`
- API: `POST /api/scientific-feedback` (text-based; no ScienceBeam PDF dependency on Windows)
- Drafting canvas "Peer-review draft" and selection "Ask Supervisor" use this pipeline

## Desktop pet — Claude / Clawd bridge
- Upstream UI reference: https://github.com/rullerzhou-afk/clawd-on-desk
- Our mapping: `src/frontend/lib/desktop-pet/` (`clawd-bridge.ts`, `catalog.ts`)
- Local asset fetch (gitignored SVGs): `node scripts/fetch-clawd-claude-assets.mjs`
- Attribution: `src/frontend/public/pets/claude/ATTRIBUTION.md`
- **License warning:** clawd-on-desk *artwork* is All Rights Reserved (`assets/LICENSE`). Clawd character © Anthropic; fan art non-commercial. Do **not** commit or redistribute fetched SVGs. Calico/Cloudling themes are not used (artist ARR).

## Attribution
Please cite the original papers/repos when publishing results that rely on these procedures.
For Claude pet visuals, also display the clawd-on-desk / Anthropic notice in `ATTRIBUTION.md`.
