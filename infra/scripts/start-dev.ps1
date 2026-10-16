$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$backendDir = Join-Path $repoRoot "apps\backend"
$frontendDir = Join-Path $repoRoot "apps\frontend"
$backendPython = Join-Path $backendDir ".venv\Scripts\python.exe"

if (-not (Test-Path $backendPython)) {
    Write-Error "Backend virtual environment not found at $backendPython. Create it first: python -m venv apps/backend/.venv"
}

$backendCommand = "Set-Location '$backendDir'; & '$backendPython' -m uvicorn app.main:app --reload --port 8000"
$frontendCommand = "Set-Location '$frontendDir'; npm run dev"

Start-Process -FilePath "powershell" -ArgumentList @("-NoExit", "-Command", $backendCommand) | Out-Null
Start-Sleep -Seconds 1
Start-Process -FilePath "powershell" -ArgumentList @("-NoExit", "-Command", $frontendCommand) | Out-Null

Write-Host "Started backend and frontend in separate PowerShell windows."
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"
