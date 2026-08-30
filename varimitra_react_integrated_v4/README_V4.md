# VariMitra Integrated V4

V4 removes Google Cloud Storage from Lost & Found intake and adds a direct local-disk report API plus a four-local-video crowd helper.

## Lost & Found: direct report API

Start the normal Lost & Found API on port 8000. External services POST multipart form data to:

`POST /reports`

Fields:
- `report_id`: unique ID such as `LF-20260829-D69ED1AF`
- `report_type`: `lost` or `found`
- `metadata`: JSON string
- `image`: image file

Storage:

```
backend/lost_found/data/lost/images/<ID>.jpg
backend/lost_found/data/lost/metadata/<ID>.json
backend/lost_found/data/found/images/<ID>.jpg
backend/lost_found/data/found/metadata/<ID>.json
```

Lost reports are enrolled into InsightFace and become ACTIVE immediately. CCTV workers refresh active cases every 5 seconds and do not need to restart. Found reports are immediately compared against active lost reports.

Example:

```powershell
.\send_report_example.ps1 `
  -ReportId "LF-20260829-D69ED1AF" `
  -ReportType lost `
  -ImagePath "C:\Users\acer\Downloads\person.jpg" `
  -Name "Rahul Patil" `
  -Age "13" `
  -Location "North Gate" `
  -ReporterContact "9876543210"
```

## Four local crowd videos

Configure all four paths with one command:

```powershell
.\set_crowd_videos.ps1 `
  -Video1 "C:\Users\acer\Videos\cam1.mp4" `
  -Video2 "C:\Users\acer\Videos\cam2.mp4" `
  -Video3 "C:\Users\acer\Videos\cam3.mp4" `
  -Video4 "C:\Users\acer\Videos\cam4.mp4"
```

Then:

```powershell
.\start_crowd_cameras.ps1
```

All four workers run independently. Local video files loop automatically at EOF, so the admin dashboard remains live for a continuous hackathon demo.

## Start everything

```powershell
cd D:\VARITHON\varimitra_react_integrated_v4
Set-ExecutionPolicy -Scope Process Bypass
.\setup.ps1
.\start_all.ps1
.\start_lost_cameras.ps1
.\start_crowd_cameras.ps1
```

Frontend: `http://127.0.0.1:5173`
Lost API: `http://127.0.0.1:8000`
Crowd API: `http://127.0.0.1:8200`
