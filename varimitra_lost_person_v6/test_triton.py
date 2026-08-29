from app.face_engine import FaceEngine
from app.config import TRITON_URL
print('Connecting to',TRITON_URL)
e=FaceEngine()
print('Server ready:',e.client.is_server_ready())
print('SCRFD metadata:',e.det_meta)
print('ArcFace metadata:',e.rec_meta)
print('V6 Triton connection OK')
