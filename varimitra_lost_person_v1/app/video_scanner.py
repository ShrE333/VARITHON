from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import cv2

from .config import ALERTS_DIR, PROCESS_EVERY_N_FRAMES
from .face_engine import FaceEngine
from .matcher import TemporalMatcher
from .registry import CaseRegistry


class VideoScanner:
    def __init__(self, face_engine: FaceEngine, registry: CaseRegistry):
        self.face_engine = face_engine
        self.registry = registry
        self.temporal = TemporalMatcher()

    def scan(
        self,
        source,
        camera_id: str,
        camera_location: str,
        display: bool = True,
    ):
        active_cases = self.registry.list_active()
        if not active_cases:
            raise RuntimeError("No ACTIVE missing-person cases exist.")

        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open video source: {source}")

        ALERTS_DIR.mkdir(parents=True, exist_ok=True)
        frame_idx = 0

        try:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break

                frame_idx += 1
                if frame_idx % PROCESS_EVERY_N_FRAMES != 0:
                    if display:
                        cv2.imshow("VariMitra Lost Person V1", frame)
                        if cv2.waitKey(1) & 0xFF == ord("q"):
                            break
                    continue

                faces = self.face_engine.detect(frame)

                for face in faces:
                    emb = self.face_engine.normalized_embedding(face)
                    match = self.temporal.best_match(emb, active_cases)

                    x1, y1, x2, y2 = [int(v) for v in face.bbox]

                    if match:
                        label = f"{match.case_id} {match.similarity:.3f}"
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 255), 2)
                        cv2.putText(
                            frame,
                            label,
                            (x1, max(20, y1 - 8)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.55,
                            (0, 255, 255),
                            2,
                        )

                        if self.temporal.register(match):
                            ts = datetime.now(timezone.utc)
                            image_name = f"{match.case_id}_{ts.strftime('%Y%m%dT%H%M%S%fZ')}.jpg"
                            image_path = ALERTS_DIR / image_name
                            cv2.imwrite(str(image_path), frame)

                            alert = {
                                "event": "POTENTIAL_MISSING_PERSON_MATCH",
                                "case_id": match.case_id,
                                "name": match.name,
                                "similarity": match.similarity,
                                "confidence_band": match.level,
                                "camera_id": camera_id,
                                "camera_location": camera_location,
                                "timestamp": ts.isoformat(),
                                "evidence_image": str(image_path),
                                "requires_admin_verification": True,
                            }
                            with (ALERTS_DIR / "alerts.jsonl").open("a", encoding="utf-8") as f:
                                f.write(json.dumps(alert) + "\n")

                            print("\nADMIN ALERT")
                            print(json.dumps(alert, indent=2))

                    else:
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (180, 180, 180), 1)

                if display:
                    cv2.imshow("VariMitra Lost Person V1", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
        finally:
            cap.release()
            if display:
                cv2.destroyAllWindows()
