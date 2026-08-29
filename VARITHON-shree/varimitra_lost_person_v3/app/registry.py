import json, uuid, cv2
from datetime import datetime, timezone
import numpy as np
from .config import CASES_DIR

class CaseRegistry:
    def __init__(self): CASES_DIR.mkdir(parents=True, exist_ok=True)
    def create_case(self,name,age,last_seen,reporter_contact,embedding,enrollment_info,reference_image_bgr):
        case_id=f'VM-LF-{uuid.uuid4().hex[:8].upper()}'; d=CASES_DIR/case_id; d.mkdir(parents=True)
        np.save(d/'embedding.npy', embedding.astype(np.float32)); cv2.imwrite(str(d/'reference.jpg'), reference_image_bgr)
        r={'case_id':case_id,'name':name,'age':age,'last_seen':last_seen,'reporter_contact':reporter_contact,'status':'ACTIVE','created_at':datetime.now(timezone.utc).isoformat(),'enrollment_info':enrollment_info,'reference_image':'reference.jpg'}
        (d/'case.json').write_text(json.dumps(r,indent=2),encoding='utf-8'); return r
    def list_active(self):
        out=[]
        for d in CASES_DIR.glob('VM-LF-*'):
            if not (d/'case.json').exists() or not (d/'embedding.npy').exists(): continue
            r=json.loads((d/'case.json').read_text(encoding='utf-8'))
            if r.get('status')!='ACTIVE': continue
            r['_embedding']=np.load(d/'embedding.npy').astype(np.float32); out.append(r)
        return out
    def public_cases(self):
        out=[]
        for r in self.list_active(): r=dict(r); r.pop('_embedding',None); out.append(r)
        return out
    def get_reference_path(self,case_id):
        p=CASES_DIR/case_id/'reference.jpg'; return p if p.exists() else None
    def close_case(self,case_id):
        p=CASES_DIR/case_id/'case.json'
        if not p.exists(): raise FileNotFoundError(case_id)
        r=json.loads(p.read_text()); r['status']='CLOSED'; r['closed_at']=datetime.now(timezone.utc).isoformat(); p.write_text(json.dumps(r,indent=2)); return r
