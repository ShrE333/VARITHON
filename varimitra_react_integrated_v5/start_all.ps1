$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$root\start_lost_api.ps1"
Start-Sleep -Seconds 3

# Lost & Found CCTV is part of the core service. Start it automatically.
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$root\start_lost_cameras.ps1"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$root\start_crowd_api.ps1"
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$root\start_frontend.ps1"

Write-Host "VariMitra launched." -ForegroundColor Cyan
Write-Host "React:       http://localhost:5173"
Write-Host "Lost API:    http://localhost:8000"
Write-Host "Lost CCTV:   STARTED AUTOMATICALLY"
Write-Host "Crowd API:   http://localhost:8200"
Write-Host "Crowd video workers remain separate: .\start_crowd_cameras.ps1" -ForegroundColor Yellow
