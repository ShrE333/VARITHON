from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CASES_DIR = DATA_DIR / "cases"
ALERTS_DIR = DATA_DIR / "alerts"

# These are STARTING POINTS only. Calibrate on your own temple/CCTV footage.
CANDIDATE_THRESHOLD = 0.45
HIGH_CONFIDENCE_THRESHOLD = 0.55

# Require repeated evidence instead of alerting on a single face.
MATCH_WINDOW_SECONDS = 8.0
MIN_MATCHES_IN_WINDOW = 4

# CCTV scanning
PROCESS_EVERY_N_FRAMES = 3
DETECTION_SIZE = (640, 640)
