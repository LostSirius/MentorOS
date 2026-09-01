# Claude pet (Clawd bridge) — attribution

## What this folder is
MentorOS maps Anthropic/Claude chat activity onto the **Clawd** animation set from [clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk) (`themes/clawd` + `assets/svg/clawd-*.svg`).

## What is committed vs local
| Path | In git? | Notes |
|------|---------|--------|
| `ATTRIBUTION.md` (this file) | Yes | Required notice |
| `*.svg`, `fetch-manifest.json`, `UPSTREAM_ASSETS_LICENSE.txt` | **No** | Fetched locally |

## Fetch (local only)
```bash
node scripts/fetch-clawd-claude-assets.mjs
```

## License / IP (must read)
Upstream `assets/LICENSE` states artwork is **All Rights Reserved** and may **not** be copied, modified, distributed, or used without permission, except personal use of the Clawd on Desk application as distributed by that project.

Additionally:
- **Clawd** character is the property of [Anthropic](https://www.anthropic.com). Fan pixel art in clawd-on-desk may **not** be used for commercial purposes.
- This MentorOS integration is **unofficial** and **not affiliated with or endorsed by** Anthropic or the clawd-on-desk authors.
- **Do not** commit fetched SVGs, ship them in public builds, or rehost them.

## Mapping layer (our code)
See `src/frontend/lib/desktop-pet/clawd-bridge.ts` for MentorOS `PetAction` → clawd filename mapping.
