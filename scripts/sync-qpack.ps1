# Sync desktop-pet SVGs into the Next.js public folder.
# Runtime reads src/frontend/public/pets/qpack — not assets/.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path $root "assets\desktop-pet\output"
$dst = Join-Path $root "src\frontend\public\pets\qpack"

if (-not (Test-Path $src)) {
    Write-Error "Missing $src"
}

foreach ($c in @("gpt", "gemini", "grok", "deepseek", "qwen", "claude")) {
    $from = Join-Path $src $c
    $to = Join-Path $dst $c
    New-Item -ItemType Directory -Force -Path $to | Out-Null
    Copy-Item -Force (Join-Path $from "*.svg") $to
    Write-Host "synced $c"
}

Write-Host "Done. Restart npm run dev if the pet sprites look stale."
