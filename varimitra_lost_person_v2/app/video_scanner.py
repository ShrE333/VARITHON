from __future__ import annotations
import json
from datetime import datetime, timezone
import cv2

from .config import ALERTS_DIR, PROCESS_EVERY_N_FRAMES
from .db import insert_alert
from .matcher import TemporalMatcher
from .tracker import SimpleFaceTracker

class VideoScanner:
    def __init__(self, face_engine, registry):
        self.face_engine = face_engine
        self.registry = registry
        self.matcher = TemporalMatcher()
        self.tracker = SimpleFaceTracker()

    def scan(self, source, camera_id, camera_location, display=True):
        active_cases = self.registry.list_active()
        if not active_cases:
            raise RuntimeError("No ACTIVE cases. Create a case first.")

        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open source: {source}")

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
                        cv2.imshow("VariMitra V2", frame)
                        if cv2.waitKey(1) & 0xFF == ord("q"):
                            break
                    continue

                faces = self.face_engine.detect(frame)
                boxes = [tuple(int(v) for v in f.bbox) for f in faces]
                track_ids = self.tracker.update(boxes)

                for face, box, track_id in zip(faces, boxes, track_ids):
                    x1, y1, x2, y2 = box
                    emb = self.face_engine.normalized_embedding(face)
                    match = self.matcher.best_match(emb, active_cases)

                    if match:
                        cv2.rectangle(frame, (x1,y1), (x2,y2), (0,255,255), 2)
                        cv2.putText(
                            frame,
                            f"T{track_id} {match.name} {match.similarity:.3f}",
                            (x1, max(20,y1-8)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.55,
                            (0,255,255),
                            2
                        )

                        if self.matcher.register(match, track_id):
                            ts = datetime.now(timezone.utc)
                            img_name = f"{match.case_id}_{ts.strftime('%Y%m%dT%H%M%S%fZ')}.jpg"
                            img_path = ALERTS_DIR / img_name
                            cv2.imwrite(str(img_path), frame)

                            alert = {
                                "event": "POTENTIAL_MISSING_PERSON_MATCH",
                                "case_id": match.case_id,
                                "name": match.name,
                                "similarity": match.similarity,
                                "confidence_band": match.level,
                                "camera_id": camera_id,
                                "camera_location": camera_location,
                                "timestamp": ts.isoformat(),
                                "evidence_image": str(img_path),
                                "track_id": track_id,
                                "requires_admin_verification": True
                            }

                            alert_id = insert_alert(alert)
                            alert["alert_id"] = alert_id

                            with (ALERTS_DIR / "alerts.jsonl").open("a", encoding="utf-8") as f:
                                f.write(json.dumps(alert) + "\n")

                            print("\nADMIN ALERT")
                            print(json.dumps(alert, indent=2))
                    else:
                        cv2.rectangle(frame, (x1,y1), (x2,y2), (180,180,180), 1)
                        cv2.putText(
                            frame,
                            f"T{track_id}",
                            (x1, max(20,y1-8)),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.5,
                            (180,180,180),
                            1
                        )

                if display:
                    cv2.imshow("VariMitra V2", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
        finally:
            cap.release()
            if display:
                cv2.destroyAllWindows()
