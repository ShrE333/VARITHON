from __future__ import annotations
import cv2
import numpy as np

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse

from .db import init_db, list_alerts, review_alert
from .face_engine import FaceEngine
from .registry import CaseRegistry

app = FastAPI(title="VariMitra Lost Person API", version="0.2.0")

init_db()
engine = FaceEngine(gpu=False)
registry = CaseRegistry()

@app.get("/health")
def health():
    return {"status": "ok", "version": "0.2.0"}

@app.get("/cases")
def get_cases():
    return registry.public_cases()

@app.post("/cases")
async def create_case(
    photo: UploadFile = File(...),
    name: str = Form(...),
    age: str | None = Form(None),
    last_seen: str | None = Form(None),
    reporter_contact: str | None = Form(None),
):
    raw = await photo.read()
    image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(400, "Invalid image.")

    try:
        embedding, info = engine.enrollment_embedding(image)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return registry.create_case(
        name, age, last_seen, reporter_contact, embedding, info
    )

@app.post("/cases/{case_id}/close")
def close_case(case_id: str):
    try:
        return registry.close_case(case_id)
    except FileNotFoundError:
        raise HTTPException(404, "Case not found.")

@app.get("/alerts")
def alerts(status: str | None = None):
    return list_alerts(status)

@app.post("/alerts/{alert_id}/confirm")
def confirm(alert_id: int):
    row = review_alert(alert_id, "CONFIRMED")
    if not row:
        raise HTTPException(404, "Alert not found.")
    return {
        **row,
        "next_action": "VariMitra may now send this admin-verified update to the reporter."
    }

@app.post("/alerts/{alert_id}/reject")
def reject(alert_id: int):
    row = review_alert(alert_id, "REJECTED")
    if not row:
        raise HTTPException(404, "Alert not found.")
    return row

@app.get("/admin", response_class=HTMLResponse)
def admin():
    return HTMLResponse('''
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>VariMitra Admin</title>
<style>
body{font-family:Arial;background:#f4f6f8;margin:30px}
.card{background:white;padding:18px;border-radius:14px;margin:16px 0;box-shadow:0 2px 10px #0001}
button{padding:10px 14px;border:0;border-radius:8px;margin-right:8px;cursor:pointer}
.ok{background:#198754;color:white}.bad{background:#dc3545;color:white}
.badge{padding:4px 8px;border-radius:999px;background:#fff3cd}
</style>
</head>
<body>
<h1>VariMitra Missing Person Admin</h1>
<p>AI candidates require admin verification.</p>
<div id="root"></div>
<script>
async function load(){
 const r=await fetch('/alerts?status=PENDING');
 const data=await r.json();
 const root=document.getElementById('root');
 root.innerHTML='';
 if(!data.length){root.innerHTML='<div class="card">No pending matches.</div>';return;}
 for(const a of data){
   const el=document.createElement('div');
   el.className='card';
   el.innerHTML=`
   <h3>${a.name} <span class="badge">${a.confidence_band}</span></h3>
   <p>
   <b>Case:</b> ${a.case_id}<br>
   <b>Similarity:</b> ${Number(a.similarity).toFixed(3)}<br>
   <b>Camera:</b> ${a.camera_id}<br>
   <b>Location:</b> ${a.camera_location}<br>
   <b>Track ID:</b> ${a.track_id}<br>
   <b>Time:</b> ${a.timestamp}
   </p>
   <button class="ok" onclick="reviewAlert(${a.alert_id},'confirm')">Confirm Match</button>
   <button class="bad" onclick="reviewAlert(${a.alert_id},'reject')">Reject</button>`;
   root.appendChild(el);
 }
}
async function reviewAlert(id,action){
 await fetch(`/alerts/${id}/${action}`,{method:'POST'});
 load();
}
load();
setInterval(load,3000);
</script>
</body>
</html>
''')
