param(
  [Parameter(Mandatory=$true)]
  [string]$ReportId
)

$encoded = [System.Uri]::EscapeDataString($ReportId)
Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:8000/reports/$encoded/ingest" | ConvertTo-Json -Depth 8
