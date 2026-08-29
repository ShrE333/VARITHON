# VariMitra React Integrated V5

## Critical fixes

1. Admin Lost & Found has **zero manual report entry forms**.
2. External reporting system sends multipart `POST /reports`.
3. Admin only monitors incoming reports, live CCTV, candidate matches, and history.
4. `start_all.ps1` starts Lost & Found camera workers automatically.
5. Local MP4 CCTV files loop forever rather than terminating at EOF.
6. Webcam/RTSP sources reconnect after read failure.
7. `multi_camera.py` auto-restarts a crashed camera worker.
8. Frontend API host follows the browser hostname, so opening React via LAN/Tailscale no longer points API calls at the viewing device's `127.0.0.1`.
9. Added report image endpoint: `GET /reports/{report_type}/{report_id}/image`.

## External intake contract

`POST /reports` as multipart/form-data:
- `report_id`
- `report_type`: `lost` or `found`
- `metadata`: JSON string
- `image`: image file

The external site owns report creation. The admin dashboard does not create reports.

## Run

```powershell
cd D:\VARITHON\varimitra_react_integrated_v5
.\setup.ps1
.\start_all.ps1
```

`start_all.ps1` now launches Lost API + Lost camera workers + Crowd API + React.

For Crowd inference, still run:

```powershell
.\start_crowd_cameras.ps1
```
