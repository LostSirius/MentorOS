# Desktop pet design source

This directory is the **design workspace** for MentorOS desktop companions.
The running app does **not** import these files. Shipped sprites live at:

`src/frontend/public/pets/qpack/<character>/*.svg`

Re-sync after editing `output/`:

```powershell
.\scripts\sync-qpack.ps1
```

## Layout

```text
desktop-pet/
├── README.md
├── AGENTS.md
├── PET_ANIMATION_SPEC.md
├── PROJECT_AUDIT_REPORT.md
├── references/
│   ├── gpt/reference.png
│   ├── gemini/reference.png
│   ├── grok/reference.png
│   ├── deepseek/reference.png
│   ├── qwen/reference.png
│   ├── claude/reference.png
│   └── copilot/reference.png
├── output/
└── preview/
```

## Product catalog

Ready in-app: `gpt`, `gemini`, `grok`, `deepseek`, `qwen`, `claude`.
Copilot remains pending (see `src/frontend/lib/desktop-pet/catalog.ts`).
