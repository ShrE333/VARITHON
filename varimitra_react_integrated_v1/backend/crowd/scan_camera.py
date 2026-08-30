import argparse, json
from pathlib import Path
from app.config import CAMERAS_PATH
from app.db import init_db
from app.worker import CrowdWorker

p = argparse.ArgumentParser()
p.add_argument("--camera-id", required=True)
p.add_argument("--display", action="store_true")
a = p.parse_args()

init_db()
cameras = json.loads(Path(CAMERAS_PATH).read_text(encoding="utf-8"))
cam = next((c for c in cameras if c["camera_id"] == a.camera_id), None)
if not cam:
    raise SystemExit(f"Camera not found: {a.camera_id}")
CrowdWorker(cam).run(display=a.display)
