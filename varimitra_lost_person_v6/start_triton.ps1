$ErrorActionPreference = "Stop"
$modelPath = (Resolve-Path .\model_repository).Path
Write-Host "Starting Triton 20.06 on host ports 8100/8101/8102..." -ForegroundColor Cyan
docker run --gpus all --rm --name varimitra-triton `
  -p 8100:8000 -p 8101:8001 -p 8102:8002 `
  -v "${modelPath}:/models" `
  nvcr.io/nvidia/tritonserver:20.06-py3 `
  tritonserver --model-repository=/models --strict-model-config=false
