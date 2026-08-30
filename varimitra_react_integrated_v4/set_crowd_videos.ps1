param(
  [Parameter(Mandatory=$true)][string]$Video1,
  [Parameter(Mandatory=$true)][string]$Video2,
  [Parameter(Mandatory=$true)][string]$Video3,
  [Parameter(Mandatory=$true)][string]$Video4
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $root 'backend\crowd\cameras.json'

$videos = @($Video1,$Video2,$Video3,$Video4)
foreach($v in $videos){
  if(-not (Test-Path $v)){ throw "Video not found: $v" }
}

$cameras = @(
  @{camera_id='CAM-01'; location='North Gate'; source=$Video1; enabled=$true; map_quad=@(@(70,80),@(460,80),@(460,300),@(70,300))},
  @{camera_id='CAM-02'; location='Queue A'; source=$Video2; enabled=$true; map_quad=@(@(460,80),@(930,80),@(930,300),@(460,300))},
  @{camera_id='CAM-03'; location='Queue B'; source=$Video3; enabled=$true; map_quad=@(@(70,300),@(500,300),@(500,650),@(70,650))},
  @{camera_id='CAM-04'; location='Darshan Area'; source=$Video4; enabled=$true; map_quad=@(@(500,300),@(930,300),@(930,650),@(500,650))}
)

$cameras | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $configPath
Write-Host "Configured four crowd videos:" -ForegroundColor Green
Get-Content $configPath
Write-Host "`nNow run: .\start_crowd_cameras.ps1" -ForegroundColor Cyan
