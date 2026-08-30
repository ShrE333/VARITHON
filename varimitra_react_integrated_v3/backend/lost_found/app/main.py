from pathlib import Path
import asyncio
from datetime import datetime, timezone

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse

from .config import CANDIDATE_THRESHOLD, DATA_DIR
from .db import (
    alert_exists,
    get_alert,
    init_db,
    insert_alert,
    list_alerts,
    list_cameras,
    list_sightings,
    review_alert,
)
from .face_engine import FaceEngine, cosine_similarity
from .gcs_reports import BUCKET_NAME, download_report_image
from .registry import CaseRegistry
from .report_store import FoundReportStore

app = FastAPI(title='VariMitra Lost Person API', version='0.7.0-gcs')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)

init_db()
engine = FaceEngine(False)
registry = CaseRegistry()
found_store = FoundReportStore(DATA_DIR)
LIVE_DIR = DATA_DIR / 'live'


def _read_image(path: str):
    image = cv2.imread(path)
    if image is None:
        raise HTTPException(400, 'Downloaded report image is not a valid image')
    return image


def _candidate_alert(case, found_report, similarity):
    camera_id = f"FOUND:{found_report['report_id']}"
    if alert_exists(case['case_id'], camera_id):
        return None

    alert = {
        'case_id': case['case_id'],
        'name': case.get('name') or case['case_id'],
        'similarity': float(similarity),
        'confidence_band': 'FOUND_REPORT',
        'camera_id': camera_id,
        'camera_location': 'Found-person report',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'evidence_image': found_report['_image_path'],
        'track_id': -1,
    }
    alert['alert_id'] = insert_alert(alert)
    return alert


def _match_found_against_active_lost(found_report):
    matches = []
    for case in registry.list_active():
        similarity = cosine_similarity(found_report['_embedding'], case['_embedding'])
        if similarity >= CANDIDATE_THRESHOLD:
            alert = _candidate_alert(case, found_report, similarity)
            matches.append({
                'case_id': case['case_id'],
                'name': case.get('name'),
                'similarity': float(similarity),
                'alert_id': alert['alert_id'] if alert else None,
                'already_alerted': alert is None,
            })
    return sorted(matches, key=lambda row: row['similarity'], reverse=True)


def _match_new_lost_against_found(case):
    matches = []
    for found_report in found_store.list_all():
        similarity = cosine_similarity(case['_embedding'], found_report['_embedding'])
        if similarity >= CANDIDATE_THRESHOLD:
            alert = _candidate_alert(case, found_report, similarity)
            matches.append({
                'found_report_id': found_report['report_id'],
                'similarity': float(similarity),
                'alert_id': alert['alert_id'] if alert else None,
                'already_alerted': alert is None,
            })
    return sorted(matches, key=lambda row: row['similarity'], reverse=True)


@app.get('/health')
def health():
    return {
        'status': 'ok',
        'version': '0.7.0-gcs',
        'gcs_bucket': BUCKET_NAME,
        'active_cases': len(registry.list_active()),
    }


@app.get('/cases')
def cases():
    return registry.public_cases()


@app.post('/cases')
async def create_case(
    photo: UploadFile = File(...),
    name: str = Form(...),
    age: str | None = Form(None),
    last_seen: str | None = Form(None),
    reporter_contact: str | None = Form(None),
):
    image = cv2.imdecode(np.frombuffer(await photo.read(), np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(400, 'Invalid image')
    try:
        embedding, info = engine.enrollment_embedding(image)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return registry.create_case(name, age, last_seen, reporter_contact, embedding, info, image)


@app.post('/reports/{report_id}/ingest')
def ingest_report(report_id: str):
    """
    Single automated intake endpoint.

    The caller sends only report_id. VariMitra searches:
      lost/<report_id>/original.jpg
      found/<report_id>/original.jpg

    Lost reports become ACTIVE CCTV cases immediately. Found reports are
    compared against all active lost cases immediately. CCTV workers do not
    need a restart because they refresh the active registry continuously.
    """
    try:
        downloaded = download_report_image(report_id, DATA_DIR)
    except FileNotFoundError:
        raise HTTPException(
            404,
            f'Report {report_id} not found in gs://{BUCKET_NAME}/lost/ or /found/',
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(502, f'GCS access failed: {exc}')

    image = _read_image(downloaded['local_path'])
    try:
        embedding, info = engine.enrollment_embedding(image)
    except ValueError as exc:
        raise HTTPException(422, f'Face enrollment failed: {exc}')

    metadata = downloaded.get('metadata') or {}

    if downloaded['report_type'] == 'lost':
        case = registry.create_case_with_id(
            case_id=report_id,
            name=metadata.get('name') or metadata.get('person_name') or report_id,
            age=metadata.get('age'),
            last_seen=metadata.get('last_seen') or metadata.get('last_seen_location'),
            reporter_contact=metadata.get('reporter_contact') or metadata.get('phone'),
            embedding=embedding,
            enrollment_info=info,
            reference_image_bgr=image,
            source='gcs',
            extra={
                'report_type': 'lost',
                'gcs_path': downloaded['gcs_path'],
                'external_report_id': report_id,
            },
        )
        active = next((row for row in registry.list_active() if row['case_id'] == report_id), None)
        historical_matches = _match_new_lost_against_found(active) if active else []
        return {
            'ok': True,
            'report_id': report_id,
            'report_type': 'lost',
            'gcs_path': downloaded['gcs_path'],
            'local_path': downloaded['local_path'],
            'case': case,
            'cctv_monitoring': 'ACTIVE',
            'camera_restart_required': False,
            'existing_found_matches': historical_matches,
        }

    found_record = found_store.save(report_id, image, embedding, metadata)
    found_record['_embedding'] = np.asarray(embedding, dtype=np.float32)
    found_record['_image_path'] = str(Path(DATA_DIR) / 'found' / report_id / 'reference.jpg')
    matches = _match_found_against_active_lost(found_record)

    return {
        'ok': True,
        'report_id': report_id,
        'report_type': 'found',
        'gcs_path': downloaded['gcs_path'],
        'local_path': downloaded['local_path'],
        'cctv_monitoring': 'NOT_APPLICABLE_FOUND_REPORT',
        'candidate_lost_matches': matches,
    }


@app.get('/cases/{case_id}/reference')
def reference(case_id: str):
    path = registry.get_reference_path(case_id)
    if not path:
        raise HTTPException(404, 'Reference not found')
    return FileResponse(path, media_type='image/jpeg')


@app.get('/alerts')
def alerts(status: str | None = None, limit: int = 100):
    return list_alerts(status, limit)


@app.get('/alerts/{alert_id}/evidence')
def evidence(alert_id: int):
    row = get_alert(alert_id)
    if not row:
        raise HTTPException(404, 'Alert not found')
    path = Path(row['evidence_image'])
    if not path.exists():
        raise HTTPException(404, 'Evidence not found')
    return FileResponse(path, media_type='image/jpeg')


@app.post('/alerts/{alert_id}/confirm')
def confirm(alert_id: int):
    row = review_alert(alert_id, 'CONFIRMED')
    if not row:
        raise HTTPException(404, 'Alert not found')
    return row


@app.post('/alerts/{alert_id}/reject')
def reject(alert_id: int):
    row = review_alert(alert_id, 'REJECTED')
    if not row:
        raise HTTPException(404, 'Alert not found')
    return row


@app.get('/cameras')
def cameras():
    return list_cameras()


@app.get('/sightings')
def sightings(case_id: str | None = None, limit: int = 100):
    return list_sightings(case_id, limit)


@app.get('/cameras/{camera_id}/stream')
async def camera_stream(camera_id: str):
    safe = ''.join(ch if ch.isalnum() or ch in '-_' else '_' for ch in camera_id)

    async def generate():
        last = None
        while True:
            try:
                frames = sorted(
                    LIVE_DIR.glob(f'{safe}_*.jpg'),
                    key=lambda path: path.stat().st_mtime,
                    reverse=True,
                )
                path = frames[0] if frames else None
                data = path.read_bytes() if path and path.exists() else None
                if data and data != last:
                    last = data
                    yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + data + b'\r\n'
                await asyncio.sleep(0.10)
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(0.25)

    return StreamingResponse(generate(), media_type='multipart/x-mixed-replace; boundary=frame')


@app.get('/admin', response_class=HTMLResponse)
def admin():
    return HTMLResponse((Path(__file__).parent / 'admin.html').read_text(encoding='utf-8'))
