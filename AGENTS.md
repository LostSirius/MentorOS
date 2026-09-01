# Agent notes (MentorOS)

This file is for coding agents working in this repository.

## Source of truth for research modules

Before changing literature / idea / experiment / writing / figures / review / polish / overview:

1. Read `docs/distill/README.md`
2. Read `docs/distill/modules/<module>.md`
3. Obey `docs/distill/shared/*`
4. Align I/O with `docs/distill/schemas/handoff.ts`
5. Wire silent prompts from `docs/distill/injectable/*` and `src/backend/plugins/phd-research/skills/`
6. Do **not** vendor entire upstream repos into `_vendor/` commits

Cursor rule: `.cursor/rules/mentoros-modules.mdc`

## Runtime vs design assets

- Runtime UI: `src/frontend`
- Runtime skills API: `src/backend` (`python main.py` → `:6000`)
- Shipped pets: `src/frontend/public/pets/qpack/<character>/*.svg`
- Design source for those pets: `assets/desktop-pet/`

## Do not

- Add a skill marketplace UI
- Auto-publish papers
- Commit `.env.local` or zip dumps
