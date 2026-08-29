import json
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse

from .config import CAMERAS_PATH, ZONES_PATH, LIVE_DIR
from .db import init_db, connect

app = FastAPI(title="VariMitra Crowd Congestion V1", version="1.0.0")

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

@app.get("/cameras/{camera_id}/frame")
def camera_frame(camera_id: str):
    with connect() as con:
        row = con.execute("SELECT latest_frame FROM camera_status WHERE camera_id=?", (camera_id,)).fetchone()
    if not row or not row["latest_frame"]:
        raise HTTPException(404, "No live frame yet")
    path = LIVE_DIR / row["latest_frame"]
    if not path.exists():
        raise HTTPException(404, "Live frame expired")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control":"no-store, no-cache, must-revalidate"})

@app.get("/admin", response_class=HTMLResponse)
def admin():
    return (Path(__file__).parent / "admin.html").read_text(encoding="utf-8")
