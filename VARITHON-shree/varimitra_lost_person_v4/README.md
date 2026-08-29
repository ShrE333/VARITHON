# VariMitra Lost Person Recognition V4

V4 keeps the working V3 recognition pipeline and adds multi-camera deployment features.

## New
- camera registry in `cameras.json`
- one process per camera via `multi_camera.py`
- camera online/offline heartbeat
- live FPS + face count per camera
- SQLite WAL mode for concurrent camera workers
- cross-camera `sightings` history
- V4 command-center admin dashboard
- side-by-side reference and CCTV evidence retained
- active cases refresh every 5 seconds without restarting workers

## Run
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Open `http://127.0.0.1:8000/docs` and create a case, then `http://127.0.0.1:8000/admin`.

### Single camera
```powershell
python scan_video.py --source "C:\path\video.mp4" --camera-id CAM-NORTH-01 --location "North Gate"
```

### Multiple cameras
Edit `cameras.json`, set your sources and enable them, then:
```powershell
python multi_camera.py
```
Use `python multi_camera.py --display` if you want local OpenCV windows.
Use `python multi_camera.py --gpu` only after installing/configuring a compatible GPU ONNX Runtime package.

## APIs added
- `GET /cameras`
- `GET /sightings`
- `GET /sightings?case_id=VM-LF-XXXXXXXX`
