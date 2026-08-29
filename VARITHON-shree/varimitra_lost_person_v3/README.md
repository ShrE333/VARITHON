# VariMitra Lost Person V3

V3 adds side-by-side reference/CCTV evidence in `/admin` and a faster inference path.

Run:
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Create a case at `http://127.0.0.1:8000/docs`, then open `http://127.0.0.1:8000/admin`.

Scanner:
```powershell
python scan_video.py --source "C:\path\video.mp4" --camera-id CAM-NORTH-01 --location "North Gate"
```

Default performance profile in `app/config.py`:
```python
DETECTION_SIZE=(512,512)
PROCESS_EVERY_N_FRAMES=2
MAX_INFERENCE_WIDTH=960
```
If below ~10 FPS, test:
```python
DETECTION_SIZE=(416,416)
PROCESS_EVERY_N_FRAMES=2
MAX_INFERENCE_WIDTH=720
```
For an aggressive speed test:
```python
DETECTION_SIZE=(384,384)
PROCESS_EVERY_N_FRAMES=3
MAX_INFERENCE_WIDTH=640
```
Do not reduce resolution blindly: validate small/distant face recall.
