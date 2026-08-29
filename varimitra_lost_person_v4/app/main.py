from pathlib import Path
import cv2,numpy as np
from fastapi import FastAPI,File,Form,HTTPException,UploadFile
from fastapi.responses import HTMLResponse,FileResponse
from .db import init_db,list_alerts,review_alert,get_alert,list_sightings,list_cameras
from .face_engine import FaceEngine
from .registry import CaseRegistry

app=FastAPI(title='VariMitra Lost Person API',version='0.4.0'); init_db(); engine=FaceEngine(False); registry=CaseRegistry()
@app.get('/health')
def health(): return {'status':'ok','version':'0.4.0'}
@app.get('/cases')
def cases(): return registry.public_cases()
@app.post('/cases')
async def create_case(photo:UploadFile=File(...),name:str=Form(...),age:str|None=Form(None),last_seen:str|None=Form(None),reporter_contact:str|None=Form(None)):
    image=cv2.imdecode(np.frombuffer(await photo.read(),np.uint8),cv2.IMREAD_COLOR)
    if image is None: raise HTTPException(400,'Invalid image')
    try: emb,info=engine.enrollment_embedding(image)
    except ValueError as e: raise HTTPException(400,str(e))
    return registry.create_case(name,age,last_seen,reporter_contact,emb,info,image)
@app.get('/cases/{case_id}/reference')
def reference(case_id:str):
    p=registry.get_reference_path(case_id)
    if not p: raise HTTPException(404,'Reference not found')
    return FileResponse(p,media_type='image/jpeg')
@app.get('/alerts')
def alerts(status:str|None=None,limit:int=100): return list_alerts(status,limit)
@app.get('/alerts/{alert_id}/evidence')
def evidence(alert_id:int):
    r=get_alert(alert_id)
    if not r: raise HTTPException(404,'Alert not found')
    p=Path(r['evidence_image'])
    if not p.exists(): raise HTTPException(404,'Evidence not found')
    return FileResponse(p,media_type='image/jpeg')
@app.post('/alerts/{alert_id}/confirm')
def confirm(alert_id:int):
    r=review_alert(alert_id,'CONFIRMED')
    if not r: raise HTTPException(404,'Alert not found')
    return r
@app.post('/alerts/{alert_id}/reject')
def reject(alert_id:int):
    r=review_alert(alert_id,'REJECTED')
    if not r: raise HTTPException(404,'Alert not found')
    return r
@app.get('/cameras')
def cameras(): return list_cameras()
@app.get('/sightings')
def sightings(case_id:str|None=None,limit:int=100): return list_sightings(case_id,limit)
@app.get('/admin',response_class=HTMLResponse)
def admin(): return HTMLResponse((Path(__file__).parent/'admin.html').read_text(encoding='utf-8'))
