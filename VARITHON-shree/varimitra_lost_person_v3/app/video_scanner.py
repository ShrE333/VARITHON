import cv2,json,time
from collections import deque
from datetime import datetime,timezone
from .config import ALERTS_DIR,PROCESS_EVERY_N_FRAMES,MAX_INFERENCE_WIDTH,FPS_SMOOTHING
from .db import insert_alert
from .matcher import TemporalMatcher
from .tracker import SimpleFaceTracker
class VideoScanner:
    def __init__(self,face_engine,registry): self.face_engine=face_engine; self.registry=registry; self.matcher=TemporalMatcher(); self.tracker=SimpleFaceTracker(); self.cached=[]
    def resize(self,frame):
        h,w=frame.shape[:2]
        if w<=MAX_INFERENCE_WIDTH: return frame,1.0
        s=MAX_INFERENCE_WIDTH/w; return cv2.resize(frame,(int(w*s),int(h*s)),interpolation=cv2.INTER_AREA),s
    @staticmethod
    def draw(frame,anns):
        for a in anns:
            x1,y1,x2,y2=a['bbox']; color=(0,255,255) if a['matched'] else (180,180,180); t=2 if a['matched'] else 1
            cv2.rectangle(frame,(x1,y1),(x2,y2),color,t); cv2.putText(frame,a['label'],(x1,max(20,y1-8)),cv2.FONT_HERSHEY_SIMPLEX,.55,color,t)
    def scan(self,source,camera_id,camera_location,display=True):
        cases=self.registry.list_active()
        if not cases: raise RuntimeError('No ACTIVE cases. Create one first.')
        cap=cv2.VideoCapture(source)
        if not cap.isOpened(): raise RuntimeError(f'Could not open source: {source}')
        try: cap.set(cv2.CAP_PROP_BUFFERSIZE,1)
        except: pass
        fpsq=deque(maxlen=FPS_SMOOTHING); idx=0; fps=0
        while True:
            t0=time.perf_counter(); ok,frame=cap.read()
            if not ok: break
            idx+=1
            if idx%PROCESS_EVERY_N_FRAMES==0:
                small,s=self.resize(frame); inv=1/s; faces=self.face_engine.detect(small); boxes=[tuple(int(v) for v in f.bbox) for f in faces]; tids=self.tracker.update(boxes); anns=[]
                for face,b,tid in zip(faces,boxes,tids):
                    x1,y1,x2,y2=[int(v*inv) for v in b]; emb=self.face_engine.normalized_embedding(face); m=self.matcher.best_match(emb,cases)
                    if m:
                        anns.append({'bbox':(x1,y1,x2,y2),'label':f'T{tid} {m.name} {m.similarity:.3f}','matched':True})
                        if self.matcher.register(m,tid):
                            ts=datetime.now(timezone.utc); p=ALERTS_DIR/f"{m.case_id}_{ts.strftime('%Y%m%dT%H%M%S%fZ')}.jpg"; evidence=frame.copy(); self.draw(evidence,anns); cv2.imwrite(str(p),evidence)
                            a={'case_id':m.case_id,'name':m.name,'similarity':m.similarity,'confidence_band':m.level,'camera_id':camera_id,'camera_location':camera_location,'timestamp':ts.isoformat(),'evidence_image':str(p),'track_id':tid}; a['alert_id']=insert_alert(a); print('\nADMIN ALERT'); print(json.dumps(a,indent=2))
                    else: anns.append({'bbox':(x1,y1,x2,y2),'label':f'T{tid}','matched':False})
                self.cached=anns
            self.draw(frame,self.cached); dt=time.perf_counter()-t0
            if dt>0: fpsq.append(1/dt); fps=sum(fpsq)/len(fpsq)
            cv2.putText(frame,f'FPS: {fps:.1f}',(18,34),cv2.FONT_HERSHEY_SIMPLEX,.8,(0,255,0),2)
            if display:
                cv2.imshow('VariMitra V3 - CCTV Recognition',frame)
                if cv2.waitKey(1)&0xff==ord('q'): break
        cap.release(); cv2.destroyAllWindows()
