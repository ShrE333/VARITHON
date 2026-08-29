# VariMitra Lost Person V6 — Triton 20.06

V6 keeps the V5 multi-camera/admin pipeline but moves SCRFD + ArcFace neural inference to one NVIDIA Triton server.

## Architecture
Camera workers / FastAPI -> Triton HTTP (host 8100) -> SCRFD det_10g.onnx + ArcFace w600k_r50.onnx -> GPU.

No `insightface` or local `onnxruntime` is loaded by camera workers in V6.

## 1. Create/activate venv and install app dependencies
```powershell
cd D:\VARITHON\varimitra_lost_person_v6
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2. Copy the two buffalo_l models into Triton
The script uses `%USERPROFILE%\.insightface\models\buffalo_l` by default.
```powershell
.\prepare_models.ps1
```
Expected:
- `model_repository\scrfd\1\model.onnx` = `det_10g.onnx`
- `model_repository\arcface\1\model.onnx` = `w600k_r50.onnx`

Do not commit these ONNX files to Git unless you have confirmed the model license allows your intended use.

## 3. Start Triton 20.06
Keep this terminal open:
```powershell
.\start_triton.ps1
```
The container exposes Triton container port 8000 as host port **8100** so FastAPI can continue to use 8000.

Manual equivalent:
```powershell
$modelPath=(Resolve-Path .\model_repository).Path
docker run --gpus all --rm --name varimitra-triton -p 8100:8000 -p 8101:8001 -p 8102:8002 -v "${modelPath}:/models" nvcr.io/nvidia/tritonserver:20.06-py3 tritonserver --model-repository=/models --strict-model-config=false
```

Wait until both `scrfd` and `arcface` report READY.

## 4. Test Triton from Windows
```powershell
python test_triton.py
```

## 5. Start VariMitra API
Second terminal:
```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Open:
- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/admin`
- `http://127.0.0.1:8000/health`

## 6. Create an ACTIVE missing-person case
Use `/docs` -> POST `/cases` and upload one clear face image.
Enrollment detection + embedding also go through Triton.

## 7. Configure cameras
`source: 0` is the default webcam.
```json
[
  {"camera_id":"CAM-NORTH-01","location":"North Gate","source":"C:\\path\\video.mp4","enabled":true},
  {"camera_id":"CAM-EAST-02","location":"East Queue","source":0,"enabled":true}
]
```

## 8. Start all camera workers
Third terminal:
```powershell
.\.venv\Scripts\Activate.ps1
python multi_camera.py
```
For local OpenCV windows as well:
```powershell
python multi_camera.py --display
```

## Important 20.06 note
Triton 20.06 is an old release based on CUDA 11.0. The V6 server command intentionally uses its older model auto-configuration path (`--strict-model-config=false`). If `det_10g.onnx` or `w600k_r50.onnx` requires an ONNX operator newer than the ONNX Runtime bundled in 20.06, Triton will reject the model. In that case use a newer Triton image rather than changing the VariMitra client API.
