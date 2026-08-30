"""VariMitra Backend Supervisor & Tunnel Manager.

Monitors and automatically restarts:
- Lost API (port 8000)
- Crowd API (port 8200)
- Lost CCTV Camera Workers
- Crowd CCTV Camera Workers
- Cloudflare Tunnels (ports 8000 & 8200)
"""
import os
import re
import sys
import time
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).parent.resolve()
VENV_PYTHON = BASE_DIR / ".venv" / "Scripts" / "python.exe"
CLOUDFLARED = BASE_DIR.parent / "cloudflared.exe"

if not VENV_PYTHON.exists():
    VENV_PYTHON = Path(sys.executable)

processes = {}

def start_process(name, cmd, cwd=BASE_DIR):
    print(f"[Supervisor] Starting {name}...")
    p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    processes[name] = {"proc": p, "cmd": cmd, "cwd": cwd}
    return p

def main():
    print("=" * 60)
    print("VariMitra AI Backend Supervisor")
    print("=" * 60)

    # 1. Start Lost API
    start_process("Lost API", [str(VENV_PYTHON), "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"], cwd=BASE_DIR / "backend" / "lost_found")
    
    # 2. Start Crowd API
    start_process("Crowd API", [str(VENV_PYTHON), "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8200"], cwd=BASE_DIR / "backend" / "crowd")

    # 3. Start Lost Cameras
    start_process("Lost Cameras", [str(VENV_PYTHON), "multi_camera.py"], cwd=BASE_DIR / "backend" / "lost_found")

    # 4. Start Crowd Cameras
    start_process("Crowd Cameras", [str(VENV_PYTHON), "multi_camera.py"], cwd=BASE_DIR / "backend" / "crowd")

    # 5. Start Cloudflare Tunnels
    if CLOUDFLARED.exists():
        start_process("Tunnel 8000", [str(CLOUDFLARED), "tunnel", "--url", "http://localhost:8000"])
        start_process("Tunnel 8200", [str(CLOUDFLARED), "tunnel", "--url", "http://localhost:8200"])

    print("\n[Supervisor] All backend services launched. Monitoring process health...")

    try:
        while True:
            time.sleep(5)
            for name, info in list(processes.items()):
                p = info["proc"]
                ret = p.poll()
                if ret is not None:
                    print(f"[Supervisor WARNING] {name} exited with code {ret}. Restarting in 3 seconds...")
                    time.sleep(3)
                    start_process(name, info["cmd"], info["cwd"])
    except KeyboardInterrupt:
        print("\n[Supervisor] Stopping all background processes...")
        for name, info in processes.items():
            info["proc"].terminate()

if __name__ == "__main__":
    main()
