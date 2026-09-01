# Start MentorOS locally (Windows). Run from repository root.
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$frontend = Join-Path $root "src\frontend"
$backend = Join-Path $root "src\backend"

if (-not (Test-Path (Join-Path $frontend "package.json"))) {
    Write-Error "src/frontend not found. Run this from the MentorOS repository."
}

Write-Host "Starting backend :6000 and frontend :3000 ..." -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory $backend -ArgumentList "-NoExit", "-Command", "python main.py"
Start-Process powershell -WorkingDirectory $frontend -ArgumentList "-NoExit", "-Command", "npm run dev"
Write-Host "Browser: http://localhost:3000"
Write-Host "API docs: http://localhost:6000/docs"
