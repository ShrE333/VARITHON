import json
import time
from pathlib import Path
import cv2
import numpy as np
from ultralytics import YOLO

from .config import (
    MODEL_NAME, CONFIDENCE, IOU, IMG_SIZE, LIVE_DIR, LIVE_JPEG_QUALITY,
    LIVE_PUBLISH_EVERY_SEC, DB_UPDATE_EVERY_SEC, ZONES_PATH, LEVELS
)
from .db import upsert_camera, upsert_camera_zone, set_zone_status
from .geometry import build_homography, project_point, point_in_polygon


def parse_source(value):
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return value


def congestion_level(occupancy):
    if occupancy < LEVELS["LOW"]:
        return "LOW"
    if occupancy < LEVELS["MODERATE"]:
        return "MODERATE"
    if occupancy < LEVELS["HIGH"]:
        return "HIGH"
    return "CRITICAL"


class CrowdWorker:
    def __init__(self, camera):
        self.camera = camera
        self.camera_id = camera["camera_id"]
        self.location = camera.get("location", self.camera_id)
        self.source = parse_source(camera["source"])
        self.map_quad = camera["map_quad"]
        self.model = YOLO(MODEL_NAME)
        self.zones = json.loads(Path(ZONES_PATH).read_text(encoding="utf-8"))
        LIVE_DIR.mkdir(parents=True, exist_ok=True)

    def _publish_frame(self, frame):
        # Unique filenames prevent Windows browser/file-lock collisions.
        stamp = int(time.time() * 1000)
        name = f"{self.camera_id}_{stamp}.jpg"
        path = LIVE_DIR / name
        ok, buf = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), LIVE_JPEG_QUALITY])
        if not ok:
            return None
        path.write_bytes(buf.tobytes())

        # Keep only a few latest files from this camera.
        old = sorted(LIVE_DIR.glob(f"{self.camera_id}_*.jpg"), key=lambda p: p.stat().st_mtime, reverse=True)
        for p in old[4:]:
            try:
                p.unlink()
            except OSError:
                pass
        return name

    def run(self, display=False):
        cap = cv2.VideoCapture(self.source)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        if not cap.isOpened():
            upsert_camera(self.camera_id, self.location, False, 0, 0)
            raise RuntimeError(f"Could not open source for {self.camera_id}: {self.source}")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)
        H = build_homography(width, height, self.map_quad)

        fps_hist = []
        last_publish = 0.0
        last_db = 0.0

        while True:
            t0 = time.perf_counter()
            ok, frame = cap.read()
            if not ok:
                if isinstance(self.source, str) and not str(self.source).lower().startswith(("rtsp://","http://","https://")):
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                upsert_camera(self.camera_id, self.location, False, 0, 0)
                time.sleep(1)
                continue

            # ByteTrack + pretrained person class only.
            results = self.model.track(
                frame,
                persist=True,
                tracker="bytetrack.yaml",
                classes=[0],
                conf=CONFIDENCE,
                iou=IOU,
                imgsz=IMG_SIZE,
                verbose=False,
            )

            zone_counts = {z["zone_id"]: 0 for z in self.zones}
            detected = 0
            result = results[0]
            if result.boxes is not None:
                boxes = result.boxes.xyxy.cpu().numpy()
                ids = result.boxes.id
                track_ids = ids.int().cpu().tolist() if ids is not None else [None] * len(boxes)
                confs = result.boxes.conf.cpu().numpy() if result.boxes.conf is not None else np.ones(len(boxes))
                detected = len(boxes)

                for box, tid, score in zip(boxes, track_ids, confs):
                    x1,y1,x2,y2 = [float(v) for v in box]
                    foot_x, foot_y = (x1+x2)/2.0, y2
                    map_x, map_y = project_point(H, foot_x, foot_y)

                    for z in self.zones:
                        if point_in_polygon((map_x,map_y), z["polygon"]):
                            zone_counts[z["zone_id"]] += 1
                            break

                    cv2.rectangle(frame, (int(x1),int(y1)), (int(x2),int(y2)), (0,255,0), 2)
                    label = f"person"
                    if tid is not None:
                        label += f" #{tid}"
                    label += f" {float(score):.2f}"
                    cv2.putText(frame, label, (int(x1), max(20,int(y1)-8)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0,255,0), 2)

            dt = max(time.perf_counter()-t0, 1e-6)
            fps_hist.append(1.0/dt)
            fps_hist = fps_hist[-20:]
            fps = sum(fps_hist)/len(fps_hist)

            cv2.putText(frame, f"{self.camera_id} | {self.location}", (15,28), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255,255,255), 2)
            cv2.putText(frame, f"People: {detected}  FPS: {fps:.1f}", (15,58), cv2.FONT_HERSHEY_SIMPLEX, 0.72, (255,255,255), 2)

            now = time.time()
            latest_name = None
            if now - last_publish >= LIVE_PUBLISH_EVERY_SEC:
                latest_name = self._publish_frame(frame)
                last_publish = now

            if now - last_db >= DB_UPDATE_EVERY_SEC:
                upsert_camera(self.camera_id, self.location, True, fps, detected, latest_name)
                for z in self.zones:
                    zid = z["zone_id"]
                    count = zone_counts[zid]
                    upsert_camera_zone(self.camera_id, zid, count)
                self._recalculate_global_zones()
                last_db = now

            if display:
                cv2.imshow(self.camera_id, frame)
                if cv2.waitKey(1) & 0xFF == 27:
                    break

        cap.release()
        if display:
            cv2.destroyWindow(self.camera_id)

    def _recalculate_global_zones(self):
        # For V1 use MAX across cameras observing the same zone to avoid double-counting
        # people seen by overlapping cameras. V2 can replace this with cross-camera ReID.
        from .db import connect
        with connect() as con:
            for z in self.zones:
                zid = z["zone_id"]
                row = con.execute(
                    "SELECT MAX(people_count) AS c FROM camera_zone_counts WHERE zone_id=?",
                    (zid,)
                ).fetchone()
                count = int(row["c"] or 0)
                cap = max(int(z["capacity"]), 1)
                occupancy = count / cap
                level = congestion_level(occupancy)
                set_zone_status(zid, z["name"], cap, count, occupancy, level)
