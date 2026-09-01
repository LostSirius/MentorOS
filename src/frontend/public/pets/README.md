# Desktop pet assets (`public/pets`)

## Layout

```
pets/
  qpack/           ← shipped mascot SVGs (synced from assets/desktop-pet/output)
```

## Ready characters

| Character | Path |
|-----------|------|
| GPT | `qpack/gpt/` |
| Gemini | `qpack/gemini/` |
| Grok | `qpack/grok/` |
| DeepSeek | `qpack/deepseek/` |
| Qwen | `qpack/qwen/` |
| Claude | `qpack/claude/` |

Each folder: `base.svg` + 9 actions (`idle`, `idleLook`, `thinking`, `working`, `building`, `juggling`, `error`, `happy`, `notification`).

**Copilot** remains `pending` in the catalog.

### Re-sync from design source

```powershell
.\scripts\sync-qpack.ps1
```

Design workspace: [`assets/desktop-pet/`](../../../../assets/desktop-pet/README.md)
