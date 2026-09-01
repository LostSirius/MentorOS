<p align="center">
  <img src="src/frontend/public/logo-mark.png" width="72" alt="MentorOS" />
</p>

# Contributing to MentorOS

Thank you for helping improve MentorOS. This repository follows a **research-workbench** layout: Next.js frontend + FastAPI skill backend. Please read this file before opening a pull request.

## Ground rules

- Human-in-the-loop: do not add unattended auto-publish / auto-submit flows.
- Evidence discipline: never invent citations, numbers, or paper metadata from model memory.
- Silent skills: do **not** expose skill names or a skill marketplace in the product UI.
- Locale: user-facing UI and generated narrative must support `en` and `zh`.
- Module work: follow [`docs/distill/README.md`](docs/distill/README.md) and the matching `docs/distill/modules/<module>.md`.

## Development setup

**Prerequisites:** Node.js 20.x, Python ≥ 3.10, an LLM API key (and/or Ollama).

```bash
# backend
cd src/backend
pip install -r requirements.txt
python main.py          # http://localhost:6000

# frontend (second terminal)
cd src/frontend
npm install
cp .env.local.example .env.local
npm run dev             # http://localhost:3000
```

On Windows you can also run `.\scripts\dev.ps1` from the repository root.

Do **not** commit `.env.local`, `node_modules/`, `.next/`, `_vendor/`, or zip archives.

## Branch and commit style

- Branch from `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.
- Commits: imperative, present tense (`add review manuscript upload`, not `added`).
- Keep PRs focused. Do not mix rebrands, refactors, and feature work.

## Pull requests

1. Describe **why**, not only what.
2. Note which research module(s) you touched.
3. If you change a module, update the matching distill spec / injectable when behavior changes.
4. Run what you can locally:
   - Frontend: `npm run type-check` and `npm test` in `src/frontend`
   - Backend: `python -m compileall -q .` in `src/backend`
5. Fill in the PR template.

## Directory map

| Path | Role |
| --- | --- |
| `src/frontend/` | MentorOS Next.js app (runtime) |
| `src/backend/` | Supervisor-Skills FastAPI (runtime) |
| `docs/distill/` | Canonical module specs (source of truth) |
| `assets/desktop-pet/` | Desktop-pet design source (not imported at runtime) |
| `src/frontend/public/pets/qpack/` | Shipped pet SVGs |
| `_vendor/` | Optional local clones — gitignored |

## License

By contributing, you agree that your contributions are licensed under the
[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0).
**Commercial use is not permitted.** See [`LICENSE`](LICENSE).
