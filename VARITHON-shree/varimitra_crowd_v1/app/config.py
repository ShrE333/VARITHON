from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
LIVE_DIR = DATA_DIR / "live"
DB_PATH = DATA_DIR / "crowd.db"
CAMERAS_PATH = ROOT / "cameras.json"
ZONES_PATH = ROOT / "zones.json"

MODEL_NAME = "yolo11n.pt"
CONFIDENCE = 0.35
IOU = 0.5
IMG_SIZE = 640
FRAME_SKIP = 1
LIVE_JPEG_QUALITY = 78
LIVE_PUBLISH_EVERY_SEC = 0.20
DB_UPDATE_EVERY_SEC = 0.50

# Occupancy thresholds based on count / configured capacity.
LEVELS = {
    "LOW": 0.40,
    "MODERATE": 0.70,
    "HIGH": 0.90,
}
