# VariMitra React Integrated V1

This package converts the supplied VariMitra HTML/JavaScript design into a React/Vite application and integrates the existing **non-Triton** AI modules:

1. Lost & Found AI — InsightFace / buffalo_l, temporal matching, evidence review, live processed camera feeds.
2. Crowd Congestion AI — YOLO person detection, ByteTrack, zone occupancy, processed feeds and temple heatmap.

## Project layout

```text
varimitra_react_integrated_v1/
├─ frontend/                 React + Vite website
├─ backend/
│  ├─ lost_found/            based on VariMitra Lost Person V5 (non-Triton)
│  ├─ crowd/                 VariMitra Crowd V1
│  └─ requirements.txt
├─ setup.ps1
├─ start_all.ps1
├─ start_lost_api.ps1
├─ start_lost_cameras.ps1
├─ start_crowd_api.ps1
├─ start_crowd_cameras.ps1
└─ start_frontend.ps1
```

## 1. Setup on Windows

From PowerShell:

```powershell
cd D:\VARITHON\varimitra_react_integrated_v1
Set-ExecutionPolicy -Scope Process Bypass
.\setup.ps1
```

## 2. Configure cameras

Lost & Found:

```text
backend\lost_found\cameras.json
```

Crowd:

```text
backend\crowd\cameras.json
backend\crowd\zones.json
```

A webcam can use numeric source `0`.

## 3. Start the website and APIs

```powershell
.\start_all.ps1
```

Open the Vite URL, normally:

```text
http://127.0.0.1:5173
```

Demo OTP: `123456`.

Select **Temple Admin** on login. The first admin screen contains exactly the two AI modules:

- Lost & Found AI
- Crowd Congestion AI

## 4. Lost & Found startup order

The Lost & Found camera scanner requires at least one active missing-person case.

1. Start website + APIs with `start_all.ps1`.
2. Log in as Temple Admin.
3. Open Lost & Found AI.
4. Register a missing person using one reference image.
5. Start the camera worker:

```powershell
.\start_lost_cameras.ps1
```

The React dashboard then shows:

- live processed cameras
- FPS
- Faces Detected
- Matched Faces
- pending candidate alerts
- reference image vs CCTV evidence
- Confirm / Reject
- cross-camera sighting history

## 5. Crowd startup

After editing `backend\crowd\cameras.json`:

```powershell
.\start_crowd_cameras.ps1
```

The React dashboard shows:

- all configured feeds
- people detected per camera
- online/offline state and FPS
- zone counts / capacities
- LOW / MODERATE / HIGH / CRITICAL status
- live temple heatmap

## APIs

Lost & Found API: `http://127.0.0.1:8000`

Crowd API: `http://127.0.0.1:8200`

React dev server: `http://127.0.0.1:5173`

The frontend API addresses are controlled by `frontend/.env`:

```env
VITE_LOST_API=http://127.0.0.1:8000
VITE_CROWD_API=http://127.0.0.1:8200
```

## Notes

- This version intentionally does **not** use Triton.
- Model inference stays in Python workers. React only consumes APIs and video frames.
- The Lost & Found live-frame publisher was changed to unique JPEG files to avoid the Windows `WinError 5` file-lock crash seen in V5.
- For production deployment, replace demo localStorage auth / OTP with real backend authentication before exposing the admin dashboard publicly.

## V3 additions

See `README_V3.md` for the GCS report-ID ingestion endpoint, continuous CCTV behavior, and the Group Location JSX fix.
