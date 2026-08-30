$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (!(Test-Path ".venv")) { python -m venv .venv }
& "$root\.venv\Scripts\Activate.ps1"
python -m pip install --upgrade pip
pip install -r "$root\backend\requirements.txt"

Set-Location "$root\frontend"
if (!(Test-Path ".env")) { Copy-Item .env.example .env }
npm install
Write-Host "Setup complete." -ForegroundColor Green
