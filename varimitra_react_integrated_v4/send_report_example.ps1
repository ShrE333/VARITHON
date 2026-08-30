param(
  [Parameter(Mandatory=$true)][string]$ReportId,
  [ValidateSet('lost','found')][string]$ReportType='lost',
  [Parameter(Mandatory=$true)][string]$ImagePath,
  [string]$Name='',
  [string]$Age='',
  [string]$Location='',
  [string]$ReporterContact=''
)
$metadata = @{
  name=$Name
  age=$Age
  last_seen=$Location
  reporter_contact=$ReporterContact
} | ConvertTo-Json -Compress

curl.exe -X POST "http://127.0.0.1:8000/reports" `
  -F "report_id=$ReportId" `
  -F "report_type=$ReportType" `
  -F "metadata=$metadata" `
  -F "image=@$ImagePath"
