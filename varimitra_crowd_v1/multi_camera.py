import argparse
import json
import subprocess
import sys
from pathlib import Path
from app.config import CAMERAS_PATH
from app.db import init_db

p = argparse.ArgumentParser()
p.add_argument("--display", action="store_true")
a = p.parse_args()

init_db()
cameras = json.loads(Path(CAMERAS_PATH).read_text(encoding="utf-8"))
workers = []

for cam in cameras:
    if not cam.get("enabled", True):
        continue
    cmd = [sys.executable, "scan_camera.py", "--camera-id", cam["camera_id"]]
    if a.display:
        cmd.append("--display")
    print("Starting", cam["camera_id"], "->", cam["source"])
    workers.append((cam["camera_id"], subprocess.Popen(cmd)))

try:
    for cid, proc in workers:
        code = proc.wait()
        print(f"Worker stopped: {cid} exit={code}")
except KeyboardInterrupt:
    print("Stopping camera workers...")
    for _, proc in workers:
        proc.terminate()
