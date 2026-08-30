$root = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$root\.venv\Scripts\Activate.ps1"
Set-Location "$root\backend\crowd"
uvicorn app.main:app --host 0.0.0.0 --port 8200
