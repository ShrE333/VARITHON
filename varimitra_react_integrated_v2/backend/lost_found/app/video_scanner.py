import cv2,json,time,os
from collections import deque
from datetime import datetime,timezone
from pathlib import Path
from .config import ALERTS_DIR,DATA_DIR,PROCESS_EVERY_N_FRAMES,MAX_INFERENCE_WIDTH,FPS_SMOOTHING
from .db import insert_alert,update_camera_status
from .matcher import TemporalMatcher
from .tracker import SimpleFaceTracker

LIVE_DIR = DATA_DIR / 'live'

class VideoScanner:
    def __init__(self,face_engine,registry):
        self.face_engine=face_engine; self.registry=registry
        self.matcher=TemporalMatcher(); self.tracker=SimpleFaceTracker(); self.cached=[]

    def resize(self,frame):
        h,w=frame.shape[:2]
        if w<=MAX_INFERENCE_WIDTH: return frame,1.0
        s=MAX_INFERENCE_WIDTH/w
        return cv2.resize(frame,(int(w*s),int(h*s)),interpolation=cv2.INTER_AREA),s

    @staticmethod
    def draw(frame,anns):
        for a in anns:
            x1,y1,x2,y2=a['bbox']
            color=(0,255,255) if a['matched'] else (180,180,180)
            t=2 if a['matched'] else 1
            cv2.rectangle(frame,(x1,y1),(x2,y2),color,t)
            cv2.putText(frame,a['label'],(x1,max(20,y1-8)),cv2.FONT_HERSHEY_SIMPLEX,.55,color,t)

    @staticmethod
    def publish_live_frame(camera_id,frame):
        # Unique filenames avoid WinError 5 when a browser is reading the previous JPEG.
        LIVE_DIR.mkdir(parents=True,exist_ok=True)
        safe=''.join(ch if ch.isalnum() or ch in '-_' else '_' for ch in camera_id)
        stamp=int(time.time()*1000)
        final=LIVE_DIR/f'{safe}_{stamp}.jpg'
        ok,buf=cv2.imencode('.jpg',frame,[int(cv2.IMWRITE_JPEG_QUALITY),80])
        if not ok:
            return
        final.write_bytes(buf.tobytes())
        old=sorted(LIVE_DIR.glob(f'{safe}_*.jpg'),key=lambda x:x.stat().st_mtime,reverse=True)
        for path in old[5:]:
            try: path.unlink()
            except OSError: pass

    def scan(self,source,camera_id,camera_location,display=True):
        ALERTS_DIR.mkdir(parents=True,exist_ok=True); LIVE_DIR.mkdir(parents=True,exist_ok=True)
        cases=self.registry.list_active()
        if not cases:
            update_camera_status(camera_id,camera_location,source,False,error='No ACTIVE cases')
            raise RuntimeError('No ACTIVE cases. Create one first.')
        cap=cv2.VideoCapture(source)
        if not cap.isOpened():
            update_camera_status(camera_id,camera_location,source,False,error='Could not open source')
            raise RuntimeError(f'Could not open source: {source}')
        try: cap.set(cv2.CAP_PROP_BUFFERSIZE,1)
        except: pass
        fpsq=deque(maxlen=FPS_SMOOTHING); idx=0; fps=0.0; face_count=0; matched_count=0; last_hb=0.0; last_refresh=0.0; last_live=0.0
        update_camera_status(camera_id,camera_location,source,True,0,0,0,None)
        try:
            while True:
                t0=time.perf_counter(); ok,frame=cap.read()
                if not ok: break
                now=time.monotonic(); idx+=1
                if now-last_refresh>5.0:
                    cases=self.registry.list_active(); last_refresh=now
                if idx%PROCESS_EVERY_N_FRAMES==0 and cases:
                    small,s=self.resize(frame); inv=1/s
                    faces=self.face_engine.detect(small); face_count=len(faces); matched_count=0
                    boxes=[tuple(int(v) for v in f.bbox) for f in faces]
                    tids=self.tracker.update(boxes); anns=[]
                    for face,b,tid in zip(faces,boxes,tids):
                        x1,y1,x2,y2=[int(v*inv) for v in b]
                        emb=self.face_engine.normalized_embedding(face); m=self.matcher.best_match(emb,cases)
                        if m:
                            matched_count+=1
                            anns.append({'bbox':(x1,y1,x2,y2),'label':f'T{tid} MATCH {m.name} {m.similarity:.3f}','matched':True})
                            if self.matcher.register(m,tid):
                                ts=datetime.now(timezone.utc)
                                p=ALERTS_DIR/f"{m.case_id}_{camera_id}_{ts.strftime('%Y%m%dT%H%M%S%fZ')}.jpg"
                                evidence=frame.copy(); self.draw(evidence,anns); cv2.imwrite(str(p),evidence)
                                a={'case_id':m.case_id,'name':m.name,'similarity':m.similarity,'confidence_band':m.level,'camera_id':camera_id,'camera_location':camera_location,'timestamp':ts.isoformat(),'evidence_image':str(p),'track_id':tid}
                                a['alert_id']=insert_alert(a)
                                print('\nADMIN ALERT'); print(json.dumps(a,indent=2))
                        else:
                            anns.append({'bbox':(x1,y1,x2,y2),'label':f'T{tid} FACE','matched':False})
                    self.cached=anns
                self.draw(frame,self.cached)
                dt=time.perf_counter()-t0
                if dt>0: fpsq.append(1/dt); fps=sum(fpsq)/len(fpsq)
                if now-last_hb>1.0:
                    update_camera_status(camera_id,camera_location,source,True,fps,face_count,matched_count,None); last_hb=now
                cv2.putText(frame,f'{camera_id} | FPS {fps:.1f} | Detected {face_count} | Matched {matched_count}',(18,34),cv2.FONT_HERSHEY_SIMPLEX,.68,(0,255,0),2)
                if now-last_live>=0.10:
                    self.publish_live_frame(camera_id,frame); last_live=now
                if display:
                    cv2.imshow(f'VariMitra V5 - {camera_id}',frame)
                    if cv2.waitKey(1)&0xff==ord('q'): break
        except Exception as e:
            update_camera_status(camera_id,camera_location,source,False,fps,face_count,matched_count,str(e)); raise
        finally:
            cap.release()
            if display: cv2.destroyAllWindows()
            update_camera_status(camera_id,camera_location,source,False,fps,face_count,matched_count,'Stream stopped')
