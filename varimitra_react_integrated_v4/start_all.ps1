$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$root\start_lost_api.ps1"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$root\start_crowd_api.ps1"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$root\start_frontend.ps1"
Write-Host "APIs + React launched. Lost & Found cameras may be started immediately; they wait for reports automatically." -ForegroundColor Cyan
Write-Host "Lost cameras:  .\start_lost_cameras.ps1"
Write-Host "Crowd cameras: .\start_crowd_cameras.ps1"
