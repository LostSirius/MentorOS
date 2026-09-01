# Production deploy helper: Vercel (frontend) + optional Render hook.
# Run from the MentorOS repository root:
#   $env:VERCEL_TOKEN = "vcp_..."
#   $env:RENDER_DEPLOY_HOOK_URL = "https://api.render.com/deploy/srv-..."   # optional
#   .\scripts\full-deploy.ps1
#
# Do not commit tokens.

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $root "src\frontend"))) {
  $root = $PSScriptRoot.TrimEnd('\') + "\.."
}
$frontend = Join-Path $root "src\frontend"
if (-not (Test-Path $frontend)) {
  Write-Host "src/frontend not found. Run from the MentorOS repository root." -ForegroundColor Red
  exit 1
}

if (-not $env:VERCEL_TOKEN) {
  Write-Host "请设置 VERCEL_TOKEN" -ForegroundColor Red
  exit 1
}

Write-Host ">>> Vercel 生产部署..." -ForegroundColor Cyan
Set-Location $frontend
npx --yes vercel@48.0.0 deploy --prod --yes --token $env:VERCEL_TOKEN
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($env:RENDER_DEPLOY_HOOK_URL) {
  Write-Host ">>> 触发 Render Deploy Hook..." -ForegroundColor Cyan
  Invoke-RestMethod -Uri $env:RENDER_DEPLOY_HOOK_URL -Method Post
  Write-Host ">>> Render 已触发。" -ForegroundColor Green
} else {
  Write-Host ">>> 未设置 RENDER_DEPLOY_HOOK_URL，跳过后端 Hook（若 Render 已绑 Git 会自动部署）。" -ForegroundColor Yellow
}

Write-Host ">>> 完成。" -ForegroundColor Green
