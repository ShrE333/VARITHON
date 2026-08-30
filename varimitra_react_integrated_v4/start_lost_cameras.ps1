$root = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$root\.venv\Scripts\Activate.ps1"
Set-Location "$root\backend\lost_found"
python multi_camera.py
