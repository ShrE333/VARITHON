# VariMitra React Integrated V3

V3 fixes the Group Location JSX parse failure and adds automated Google Cloud Storage intake for Lost & Found.

## GCS layout

Bucket: `varimitra-lost-found-2026`

```text
lost/LF-xxxx/original.jpg
found/LF-xxxx/original.jpg
```

Optional metadata is supported automatically if present:

```text
lost/LF-xxxx/metadata.json
found/LF-xxxx/metadata.json
```

Possible metadata keys: `name`, `person_name`, `age`, `last_seen`, `last_seen_location`, `reporter_contact`, `phone`.

## Authentication

The Python process must have Google Application Default Credentials.

Option A — service account JSON in PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
```

Option B — if Google Cloud CLI is installed:

```powershell
gcloud auth application-default login
```

The identity needs permission to read objects from `varimitra-lost-found-2026`.

## Setup

```powershell
cd D:\VARITHON\varimitra_react_integrated_v3
Set-ExecutionPolicy -Scope Process Bypass
.\setup.ps1
```

## Start everything

Terminal 1 / launcher:

```powershell
.\start_all.ps1
```

Start Lost & Found CCTV once:

```powershell
.\start_lost_cameras.ps1
```

The cameras no longer stop when there are zero ACTIVE cases. They continue publishing feeds and refresh the active case registry every five seconds.

## Single automated report endpoint

```http
POST /reports/{report_id}/ingest
```

Example:

```powershell
Invoke-RestMethod -Method POST -Uri "http://127.0.0.1:8000/reports/LF-20260829-D69ED1AF/ingest"
```

or:

```powershell
.\ingest_report.ps1 -ReportId "LF-20260829-D69ED1AF"
```

No request body and no report type are required.

### What happens

1. Search `lost/<ID>/original.jpg`.
2. If absent, search `found/<ID>/original.jpg`.
3. Download locally.
4. Detect/enroll the face using the existing non-Triton InsightFace engine.
5. If LOST: create an ACTIVE case using the external Report ID and let already-running CCTV workers discover it automatically.
6. If FOUND: store its embedding and compare it immediately against every ACTIVE lost case. Candidate matches appear in the normal admin verification queue.
7. When a new LOST report arrives, it is also compared against found reports already ingested earlier.

## React admin

Lost & Found now has a GCS Report Intake box. Enter only the unique report ID and click **Fetch & Start Automation**.

The old manual image upload remains under **Manual fallback enrollment**.
