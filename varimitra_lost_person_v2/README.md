# VariMitra Lost Person Recognition V2

## Upgrades over V1

- Face tracking with stable temporary Track IDs
- Multi-frame verification now tied to the same tracked face
- SQLite alert database
- Admin review dashboard
- Pending / Confirmed / Rejected alert states
- Confirmed alerts are ready for future WhatsApp integration

## Install

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Start API

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open:

```text
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/admin
```

## Add Missing Person

Use POST `/cases` in Swagger at `/docs`.

Upload one clear face image and provide metadata.

## Scan Your Video

```powershell
python scan_video.py --source "C:\Users\acer\Downloads\your_video.mp4" --camera-id CAM-NORTH-01 --location "North Gate"
```

## What happens

CCTV face
-> ArcFace embedding
-> active-case matching
-> temporary Track ID
-> repeated same-track matches
-> PENDING alert
-> Admin dashboard
-> Confirm / Reject

The system does NOT automatically tell a family that a person has been found.

## Next upgrade

V3 should add:

1. WhatsApp report intake
2. Admin evidence-image preview
3. Confirmed-match WhatsApp callback
4. Multi-camera camera registry
5. Cross-camera trajectory
6. threshold benchmarking
