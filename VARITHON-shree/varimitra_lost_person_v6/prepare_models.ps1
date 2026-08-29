param(
  [string]$InsightFaceDir = "$env:USERPROFILE\.insightface\models\buffalo_l"
)
$ErrorActionPreference = "Stop"
$det = Join-Path $InsightFaceDir "det_10g.onnx"
$rec = Join-Path $InsightFaceDir "w600k_r50.onnx"
if (!(Test-Path $det)) { throw "Missing detector: $det" }
if (!(Test-Path $rec)) { throw "Missing recognizer: $rec" }
New-Item -ItemType Directory -Force .\model_repository\scrfd\1 | Out-Null
New-Item -ItemType Directory -Force .\model_repository\arcface\1 | Out-Null
Copy-Item $det .\model_repository\scrfd\1\model.onnx -Force
Copy-Item $rec .\model_repository\arcface\1\model.onnx -Force
Write-Host "Copied SCRFD and ArcFace models into Triton model_repository." -ForegroundColor Green
