from __future__ import annotations

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
        self.app.prepare(
            ctx_id=0 if gpu else -1,
            det_size=DETECTION_SIZE,
        )

    def detect(self, image_bgr: np.ndarray):
        return self.app.get(image_bgr)

    @staticmethod
    def normalized_embedding(face) -> np.ndarray:
        emb = np.asarray(face.embedding, dtype=np.float32)
        norm = np.linalg.norm(emb)
        if norm <= 1e-12:
            raise ValueError("Invalid zero-length face embedding.")
        return emb / norm

    def enrollment_embedding(self, image_bgr: np.ndarray) -> tuple[np.ndarray, dict]:
        faces = self.detect(image_bgr)

        if len(faces) == 0:
            raise ValueError("No face detected. Upload a clearer front-facing photograph.")

        if len(faces) > 1:
            raise ValueError(
                "More than one face was detected. Crop the image so only the missing person is visible."
            )

        face = faces[0]
        x1, y1, x2, y2 = [int(v) for v in face.bbox]
        width, height = max(0, x2 - x1), max(0, y2 - y1)

        # Simple input-quality signals. We keep them visible instead of pretending
        # that one number is a universal 'quality score'.
        crop = image_bgr[max(0, y1):max(0, y2), max(0, x1):max(0, x2)]
        blur = None
        if crop.size:
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        info = {
            "bbox": [x1, y1, x2, y2],
            "face_width": width,
            "face_height": height,
            "det_score": float(face.det_score),
            "blur_variance": blur,
        }
        return self.normalized_embedding(face), info


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    # Embeddings are L2-normalized, so dot product == cosine similarity.
    return float(np.dot(a, b))
