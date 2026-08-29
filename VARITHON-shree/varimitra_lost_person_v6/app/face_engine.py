"""Face detection + recognition, running locally via InsightFace (buffalo_l).

Replaces the original Triton-server client: the Triton 20.06 image this
project shipped with cannot initialise CUDA on current GPUs, and running a
separate inference server is unnecessary for a single-machine setup. The
public interface is unchanged, so main.py / matcher.py / video_scanner.py
work as before.
"""

import cv2
import numpy as np
from insightface.app import FaceAnalysis

from .config import DETECTION_SIZE


class FaceEngine:
    def __init__(self, gpu: bool = False):
        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if gpu
            else ["CPUExecutionProvider"]
        )
        self.app = FaceAnalysis(name="buffalo_l", providers=providers)
        self.app.prepare(ctx_id=0 if gpu else -1, det_size=DETECTION_SIZE)
        self.ready = True

    def detect(self, image_bgr):
        return self.app.get(image_bgr)

    def detect_and_embed(self, image_bgr):
        # InsightFace's get() already returns embeddings alongside detections.
        return [f for f in self.app.get(image_bgr) if f.embedding is not None]

    @staticmethod
    def normalized_embedding(face):
        e = np.asarray(face.embedding, dtype=np.float32)
        norm = float(np.linalg.norm(e))
        if norm <= 1e-12:
            raise ValueError("Invalid zero-length face embedding.")
        return e / norm

    def enrollment_embedding(self, image_bgr):
        faces = self.detect_and_embed(image_bgr)
        if len(faces) == 0:
            raise ValueError("No face detected. Upload a clearer front-facing photo.")
        if len(faces) > 1:
            raise ValueError("More than one face detected. Crop to one person.")

        face = faces[0]
        x1, y1, x2, y2 = [int(v) for v in face.bbox]
        crop = image_bgr[max(0, y1):max(0, y2), max(0, x1):max(0, x2)]

        blur = None
        if crop.size:
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        info = {
            "bbox": [x1, y1, x2, y2],
            "det_score": float(face.det_score),
            "blur_variance": blur,
            "inference": "insightface-local",
        }
        return self.normalized_embedding(face), info


def cosine_similarity(a, b):
    # Embeddings are L2-normalized, so dot product == cosine similarity.
    return float(np.dot(a, b))
