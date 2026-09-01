import type { PetAction, PetActionAsset } from "./types"

/**
 * Bridge map: MentorOS PetAction → clawd-on-desk SVG filenames.
 * Source of truth for filenames: themes/clawd/theme.json + assets/svg/
 * Upstream: https://github.com/rullerzhou-afk/clawd-on-desk
 *
 * Artwork is NOT redistributed in git. Run:
 *   node scripts/fetch-clawd-claude-assets.mjs
 */
const CLAWD_DIR = "/pets/claude"

type ClawdBridgeEntry = {
  file: string
  durationMs?: number
  loop?: boolean
}

/** MVP + interaction set we actually fetch and serve locally. */
export const CLAUDE_CLAWD_BRIDGE: Record<PetAction, ClawdBridgeEntry> = {
  idle: { file: "clawd-idle-follow.svg", loop: true },
  idleLook: { file: "clawd-idle-look.svg", durationMs: 6500, loop: false },
  thinking: { file: "clawd-working-thinking.svg", loop: true },
  working: { file: "clawd-working-typing.svg", loop: true },
  building: { file: "clawd-working-building.svg", loop: true },
  juggling: { file: "clawd-working-juggling.svg", loop: true },
  error: { file: "clawd-error.svg", durationMs: 5000, loop: false },
  happy: { file: "clawd-happy.svg", durationMs: 4000, loop: false },
  notification: { file: "clawd-notification.svg", durationMs: 5000, loop: false },
  yawning: { file: "clawd-idle-yawn.svg", durationMs: 3000, loop: false },
  sleeping: { file: "clawd-sleeping.svg", loop: true },
  waking: { file: "clawd-wake.svg", durationMs: 1500, loop: false },
  drag: { file: "clawd-react-drag.svg", loop: true },
  clickLeft: { file: "clawd-react-left.svg", durationMs: 2500, loop: false },
  clickRight: { file: "clawd-react-right.svg", durationMs: 2500, loop: false },
  annoyed: { file: "clawd-react-annoyed.svg", durationMs: 3500, loop: false },
  double: { file: "clawd-react-double.svg", durationMs: 3500, loop: false }
}

/** Local public filename (stable for our player): <action>.svg */
export function buildClaudeActionAssets(): Partial<
  Record<PetAction, PetActionAsset>
> {
  const out: Partial<Record<PetAction, PetActionAsset>> = {}
  for (const [action, entry] of Object.entries(CLAUDE_CLAWD_BRIDGE) as [
    PetAction,
    ClawdBridgeEntry
  ][]) {
    out[action] = {
      action,
      publicPath: `${CLAWD_DIR}/${action}.svg`,
      format: "svg",
      upstreamPath: `assets/svg/${entry.file}`,
      durationMs: entry.durationMs,
      loop: entry.loop ?? true
    }
  }
  return out
}

/** Extra upstream files useful later (not fetched by default). */
export const CLAUDE_CLAWD_OPTIONAL_UPSTREAM = [
  "assets/svg/clawd-headphones-groove.svg",
  "assets/svg/clawd-idle-bubble.svg",
  "assets/svg/clawd-idle-reading.svg",
  "assets/svg/clawd-idle-doze.svg",
  "assets/svg/clawd-collapse-sleep.svg",
  "assets/svg/clawd-react-double-jump.svg",
  "assets/svg/clawd-working-sweeping.svg",
  "assets/svg/clawd-working-carrying.svg",
  "assets/svg/clawd-mini-idle.svg"
] as const
