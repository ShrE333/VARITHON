# VariMitra Lost Person V5

V5 adds browser-based live processed CCTV feeds to the admin dashboard and separates total detected faces from faces currently matching an active missing-person case.

## Main changes
- Every enabled camera publishes its processed AI frame to the admin panel.
- `/cameras/{camera_id}/stream` provides an MJPEG stream for the browser.
- Camera cards show FPS, **Detected Faces**, and **Matched Faces** separately.
- Candidate alerts are camera-agnostic: video files, webcam `0`, and RTSP sources use the same matching/alert path.
- Multi-camera worker model from V4 is retained.

## Meaning of counters
- **Detected Faces** = every face detector output currently visible in that camera frame.
- **Matched Faces** = detected faces whose embedding similarity is above `CANDIDATE_THRESHOLD` for at least one ACTIVE case. This is NOT the number of confirmed admin alerts.
- **Pending Candidate Matches** = temporally confirmed alerts that passed `MIN_MATCHES_IN_WINDOW` and await admin confirm/reject.

## Run
```powershell
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

In another terminal:
```powershell
python multi_camera.py
```

Open:
`http://127.0.0.1:8000/admin`

For local OpenCV windows too:
```powershell
python multi_camera.py --display
```

Example `cameras.json`:
```json
[
  {"camera_id":"CAM-NORTH-01","location":"North Gate","source":"C:\\path\\video.mp4","enabled":true},
  {"camera_id":"CAM-EAST-02","location":"East Queue","source":0,"enabled":true}
]
```
