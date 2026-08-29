from pathlib import Path
import asyncio,cv2,numpy as np
from fastapi import FastAPI,File,Form,HTTPException,UploadFile
from fastapi.responses import HTMLResponse,FileResponse,StreamingResponse
from .config import DATA_DIR,TRITON_URL
from .db import init_db,list_alerts,review_alert,get_alert,list_sightings,list_cameras
from .face_engine import FaceEngine
from .registry import CaseRegistry

app=FastAPI(title='VariMitra Lost Person API',version='0.6.0');init_db();registry=CaseRegistry();engine=None
LIVE_DIR=DATA_DIR/'live'

def get_engine():
    global engine
    if engine is None:engine=FaceEngine()
    return engine

@app.get('/health')
def health():
    try:e=get_engine();triton=e.client.is_server_ready()
    except Exception as ex:return {'status':'degraded','version':'0.6.0','triton_url':TRITON_URL,'triton_ready':False,'error':str(ex)}
    return {'status':'ok','version':'0.6.0','triton_url':TRITON_URL,'triton_ready':bool(triton)}
@app.get('/cases')
def cases():return registry.public_cases()
@app.post('/cases')
async def create_case(photo:UploadFile=File(...),name:str=Form(...),age:str|None=Form(None),last_seen:str|None=Form(None),reporter_contact:str|None=Form(None)):
    image=cv2.imdecode(np.frombuffer(await photo.read(),np.uint8),cv2.IMREAD_COLOR)
    if image is None:raise HTTPException(400,'Invalid image')
    try:emb,info=get_engine().enrollment_embedding(image)
    except (ValueError,RuntimeError) as e:raise HTTPException(400,str(e))
    return registry.create_case(name,age,last_seen,reporter_contact,emb,info,image)
@app.post('/cases/{case_id}/close')
def close(case_id:str):
    try:return registry.close_case(case_id)
    except FileNotFoundError:raise HTTPException(404,'Case not found')
@app.get('/cases/{case_id}/reference')
def reference(case_id:str):
    p=registry.get_reference_path(case_id)
    if not p:raise HTTPException(404,'Reference not found')
    return FileResponse(p,media_type='image/jpeg')
@app.get('/alerts')
def alerts(status:str|None=None,limit:int=100):return list_alerts(status,limit)
@app.get('/alerts/{alert_id}/evidence')
def evidence(alert_id:int):
    r=get_alert(alert_id)
    if not r:raise HTTPException(404,'Alert not found')
    p=Path(r['evidence_image'])
    if not p.exists():raise HTTPException(404,'Evidence not found')
    return FileResponse(p,media_type='image/jpeg')
@app.post('/alerts/{alert_id}/confirm')
def confirm(alert_id:int):
    r=review_alert(alert_id,'CONFIRMED')
    if not r:raise HTTPException(404,'Alert not found')
    return r
@app.post('/alerts/{alert_id}/reject')
def reject(alert_id:int):
    r=review_alert(alert_id,'REJECTED')
    if not r:raise HTTPException(404,'Alert not found')
    return r
@app.get('/cameras')
def cameras():return list_cameras()
@app.get('/sightings')
def sightings(case_id:str|None=None,limit:int=100):return list_sightings(case_id,limit)
@app.get('/cameras/{camera_id}/stream')
async def camera_stream(camera_id:str):
    safe=''.join(ch if ch.isalnum() or ch in '-_' else '_' for ch in camera_id)
    async def gen():
        last_path=None;last_mtime=0
        while True:
            try:
                files=list(LIVE_DIR.glob(f'{safe}_*.jpg')) if LIVE_DIR.exists() else []
                if files:
                    p=max(files,key=lambda x:x.stat().st_mtime);mt=p.stat().st_mtime
                    if p!=last_path or mt!=last_mtime:
                        try:data=p.read_bytes()
                        except OSError:data=None
                        if data:
                            last_path,last_mtime=p,mt
                            yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n'+data+b'\r\n'
                await asyncio.sleep(.10)
            except asyncio.CancelledError:break
            except Exception:await asyncio.sleep(.20)
    return StreamingResponse(gen(),media_type='multipart/x-mixed-replace; boundary=frame')
@app.get('/admin',response_class=HTMLResponse)
def admin():return HTMLResponse((Path(__file__).parent/'admin.html').read_text(encoding='utf-8'))
