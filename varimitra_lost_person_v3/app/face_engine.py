import cv2
import numpy as np
from insightface.app import FaceAnalysis
from .config import DETECTION_SIZE

class FaceEngine:
    def __init__(self, gpu=False):
        providers = ['CUDAExecutionProvider','CPUExecutionProvider'] if gpu else ['CPUExecutionProvider']
        self.app = FaceAnalysis(name='buffalo_l', providers=providers)
        self.app.prepare(ctx_id=0 if gpu else -1, det_size=DETECTION_SIZE)
    def detect(self, image_bgr):
        return self.app.get(image_bgr)
    @staticmethod
    def normalized_embedding(face):
        e = np.asarray(face.embedding, dtype=np.float32)
        return e / max(np.linalg.norm(e), 1e-12)
    def enrollment_embedding(self, image_bgr):
        faces = self.detect(image_bgr)
        if len(faces) == 0: raise ValueError('No face detected. Upload a clearer front-facing photo.')
        if len(faces) > 1: raise ValueError('More than one face detected. Crop to one person.')
        f = faces[0]
        x1,y1,x2,y2 = [int(v) for v in f.bbox]
        crop = image_bgr[max(0,y1):max(0,y2), max(0,x1):max(0,x2)]
        blur = None
        if crop.size:
            blur = float(cv2.Laplacian(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY), cv2.CV_64F).var())
        return self.normalized_embedding(f), {'bbox':[x1,y1,x2,y2], 'det_score':float(f.det_score), 'blur_variance':blur}

def cosine_similarity(a,b): return float(np.dot(a,b))
