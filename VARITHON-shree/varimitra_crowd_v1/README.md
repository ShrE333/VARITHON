# VariMitra Crowd Congestion V1

Four-camera crowd monitoring prototype for VariMitra.

## Features
- Up to 4 configurable camera/video/RTSP feeds
- Pretrained YOLO11n person detection
- ByteTrack person tracking
- Person counting per frame
- Camera-to-temple-map perspective projection
- Configurable temple zones + capacities
- LOW / MODERATE / HIGH / CRITICAL congestion levels
- Global zone heatmap
- Live processed feeds in FastAPI admin panel
- Windows-safe live frame publishing (unique JPEG files)

## Install
```powershell
cd D:\VARITHON\varimitra_crowd_v1
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

The first run downloads `yolo11n.pt` automatically.

## Camera configuration
Edit `cameras.json`.

`source` can be:
- `0` = default webcam
- `1` = second webcam
- a local MP4 path
- an RTSP URL

Enable up to four cameras by setting `"enabled": true`.

## Map calibration
Each camera has a `map_quad`, four points on the 1000x700 temple map:
```json
"map_quad": [[70,80],[460,80],[460,300],[70,300]]
```
The current V1 assumes the full CCTV image approximately corresponds to that quadrilateral. This is enough for the demo. For accurate real deployment, calibrate each camera using four known ground-plane points.

## Zone capacities
Edit `zones.json` to change temple regions and safe capacities.

## Run backend
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8200
```
Open:
- http://127.0.0.1:8200/admin
- http://127.0.0.1:8200/docs

## Start cameras
In another terminal:
```powershell
.\.venv\Scripts\Activate.ps1
python multi_camera.py
```
Optional local OpenCV windows:
```powershell
python multi_camera.py --display
```

## Important V1 fusion rule
If two cameras overlap the same zone, V1 uses the MAX count reported for that zone rather than SUM. That deliberately avoids obvious double-counting. V2 should add cross-camera ReID / topology-aware fusion for accurate overlapping-camera counts.
