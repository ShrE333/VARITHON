import json
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import CAMERAS_PATH, ZONES_PATH, LIVE_DIR
from .db import init_db, connect

app = FastAPI(title="VariMitra Crowd Congestion V1", version="1.0.1-react")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    init_db()

@app.get("/health")
def health():
    return {"status":"ok","module":"varimitra_crowd_v1"}

@app.get("/cameras")
def cameras():
    configured = json.loads(Path(CAMERAS_PATH).read_text(encoding="utf-8"))
    with connect() as con:
        status = {r["camera_id"]: dict(r) for r in con.execute("SELECT * FROM camera_status").fetchall()}
    now = time.time()
    out = []
    for c in configured:
        s = status.get(c["camera_id"], {})
        online = bool(s.get("online",0)) and now - float(s.get("updated_at",0)) < 3.0
        out.append({**c, **s, "online": online})
    return out

@app.get("/zones")
def zones():
    configured = json.loads(Path(ZONES_PATH).read_text(encoding="utf-8"))
    with connect() as con:
        status = {r["zone_id"]: dict(r) for r in con.execute("SELECT * FROM zone_status").fetchall()}
    return [{**z, **status.get(z["zone_id"], {})} for z in configured]

@app.get("/map")
def map_data():
    return {
        "width":1000,
        "height":700,
        "zones": zones(),
        "cameras": cameras(),
    }

import asyncio
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse

@app.get("/cameras/{camera_id}/frame")
def camera_frame(camera_id: str):
    with connect() as con:
        row = con.execute("SELECT latest_frame FROM camera_status WHERE camera_id=?", (camera_id,)).fetchone()
    path = None
    if row and row["latest_frame"]:
        p = LIVE_DIR / row["latest_frame"]
        if p.exists():
            path = p

    if not path:
        # Fallback: get the most recent frame file for this camera from LIVE_DIR
        files = sorted(LIVE_DIR.glob(f"{camera_id}_*.jpg"), key=lambda x: x.stat().st_mtime, reverse=True)
        if files:
            path = files[0]

    if not path or not path.exists():
        raise HTTPException(404, "No live frame available yet")

    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "no-store, no-cache, must-revalidate"})


@app.get("/cameras/{camera_id}/stream")
async def camera_stream(camera_id: str):
    async def gen():
        last_mtime = 0
        while True:
            files = sorted(LIVE_DIR.glob(f"{camera_id}_*.jpg"), key=lambda x: x.stat().st_mtime, reverse=True)
            if files:
                latest = files[0]
                try:
                    mtime = latest.stat().st_mtime
                    if mtime > last_mtime:
                        last_mtime = mtime
                        buf = latest.read_bytes()
                        yield (
                            b"--frame\r\n"
                            b"Content-Type: image/jpeg\r\n\r\n" + buf + b"\r\n"
                        )
                except Exception:
                    pass
            await asyncio.sleep(0.1)

    return StreamingResponse(gen(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/admin", response_class=HTMLResponse)
def admin():
    return (Path(__file__).parent / "admin.html").read_text(encoding="utf-8")

