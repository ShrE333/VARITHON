import argparse
from app.db import init_db
from app.face_engine import FaceEngine
from app.registry import CaseRegistry
from app.video_scanner import VideoScanner
p=argparse.ArgumentParser(); p.add_argument('--source',required=True); p.add_argument('--camera-id',required=True); p.add_argument('--location',required=True); p.add_argument('--gpu',action='store_true'); p.add_argument('--no-display',action='store_true'); a=p.parse_args()
try: source=int(a.source)
except: source=a.source
init_db(); VideoScanner(FaceEngine(a.gpu),CaseRegistry()).scan(source,a.camera_id,a.location,not a.no_display)
