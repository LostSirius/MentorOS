/**
 * Fetch Clawd (Claude) SVGs from clawd-on-desk for LOCAL personal/dev use only.
 *
 * Artwork license (upstream assets/LICENSE): All Rights Reserved.
 * - Clawd character © Anthropic — fan art, non-commercial.
 * - Do NOT commit, redistribute, or publish these files.
 *
 * Usage:
 *   node scripts/fetch-clawd-claude-assets.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const OUT_DIR = path.join(
  ROOT,
  "src",
  "frontend",
  "public",
  "pets",
  "claude"
)

const REPO = "rullerzhou-afk/clawd-on-desk"
const REF = "main"
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}`

/** Scholar action → upstream clawd filename */
const BRIDGE = {
  idle: "clawd-idle-follow.svg",
  idleLook: "clawd-idle-look.svg",
  thinking: "clawd-working-thinking.svg",
  working: "clawd-working-typing.svg",
  building: "clawd-working-building.svg",
  juggling: "clawd-working-juggling.svg",
  error: "clawd-error.svg",
  happy: "clawd-happy.svg",
  notification: "clawd-notification.svg",
  yawning: "clawd-idle-yawn.svg",
  sleeping: "clawd-sleeping.svg",
  waking: "clawd-wake.svg",
  drag: "clawd-react-drag.svg",
  clickLeft: "clawd-react-left.svg",
  clickRight: "clawd-react-right.svg",
  annoyed: "clawd-react-annoyed.svg",
  double: "clawd-react-double.svg"
}

async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buf)
  return buf.length
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // Mirror upstream artwork license notice next to fetched files.
  const licenseUrl = `${RAW}/assets/LICENSE`
  const licenseDest = path.join(OUT_DIR, "UPSTREAM_ASSETS_LICENSE.txt")
  try {
    await download(licenseUrl, licenseDest)
  } catch (err) {
    fs.writeFileSync(
      licenseDest,
      "See https://github.com/rullerzhou-afk/clawd-on-desk/blob/main/assets/LICENSE\n"
    )
    console.warn("Could not fetch upstream LICENSE, wrote pointer:", err.message)
  }

  const manifest = {
    character: "claude",
    bridgedFrom: `https://github.com/${REPO}`,
    theme: "clawd",
    fetchedAt: new Date().toISOString(),
    ref: REF,
    notice:
      "Local personal/dev use only. Do not commit or redistribute these SVGs.",
    actions: {}
  }

  console.log(`Fetching Clawd SVGs → ${OUT_DIR}`)
  for (const [action, file] of Object.entries(BRIDGE)) {
    const upstream = `assets/svg/${file}`
    const url = `${RAW}/${upstream}`
    const dest = path.join(OUT_DIR, `${action}.svg`)
    process.stdout.write(`  ${action} ← ${file} ... `)
    try {
      const bytes = await download(url, dest)
      console.log(`${bytes} bytes`)
      manifest.actions[action] = {
        local: `${action}.svg`,
        upstream,
        url
      }
    } catch (err) {
      console.log(`FAILED (${err.message})`)
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "fetch-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  )
  console.log("\nDone. SVGs are gitignored. Keep ATTRIBUTION.md in place.")
  console.log("Reminder: Anthropic Clawd IP + ARR artwork — non-commercial local use only.")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
